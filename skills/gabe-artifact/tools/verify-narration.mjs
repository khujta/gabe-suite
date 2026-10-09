/* gabe-artifact · recorded-narration gate (H7, engine "recorded")
 *
 * Proves a narrated page works before it is published: the dock is ONE sticky bar in the flow — sections menu, Play all
 * and Next as named icons, the player, the cog riding at its right — and nothing on the page is fixed
 * (operator 2026-10-05); the menu lists every section with its icon, hides until asked, moves focus in, walks on the
 * arrows, and closes on Escape (focus back), an outside click and the cog; every clip has a duration and one timing per spoken word;
 * the spoken text carries no digit, id or symbol (a number pair, script v4, is read by its spoken side — data-say — and the
 * page's shown number must carry spoken words); (script v2) every section shows its whole script with
 * at least one figure between the paragraphs, and the figure tied to the paragraph under the voice goes live; the player plays the section in view, seeks from the dock and from a
 * section's own bar, restarts, steps next and back, stops, starts over, chains on Play all, changes speed and keeps it
 * across clips, and answers the space bar; (script v3) a cue word steps its figure — data-step, the named part "now" —
 * and stop returns every figure whole; the reading wave lights the word the timings predict, with its neighbours,
 * on ONE copy of each word — and narrows to the current word under reduced motion or Motion: Paused; nothing in the
 * dock or the transcript falls under 12px; the page reflows at 390px with the menu inside the screen and no dock
 * control overlapping another.
 *
 * Usage:  node tools/verify-narration.mjs <page.html>
 * Audio really plays (headless Chromium, autoplay allowed), so the run takes ~40 s. Run it alone (WSL2 rule).
 * Exit 0 = every check passed; 1 = a check failed; 2 = the gate could not run.
 * Spec: references/narration.md §7. Built from the reference kit's player test (handoff 2026-10-03, ptest.mjs).
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

if (!process.argv[2] || !existsSync(resolve(process.argv[2]))) { console.error('usage: node verify-narration.mjs <page.html>'); process.exit(2); }
const target = resolve(process.argv[2]);
const html = await readFile(target, 'utf8');
const results = [];
const check = (name, ok, detail) => {
  results.push({ name, ok: !!ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== undefined && detail !== '' ? `  — ${detail}` : ''}`);
};
if (!/data-narration="recorded"/.test(html)) {
  check('the page carries the recorded-narration dock (nav#dock[data-narration="recorded"])', false, 'build it with tools/narrate-build.py');
  process.exit(1);
}

const { chromium } = await import(new globalThis.URL('../../gabe-docsite/tools/_playwright.mjs', import.meta.url).href).catch(() => import(`${process.env.HOME}/.claude/skills/gabe-docsite/tools/_playwright.mjs`));   // the suite's sibling path, else the installed suite (a project fork)
const server = createServer((_q, r) => { r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); r.end(html); });
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const URL = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(p, fn, arg, ms = 6000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await p.evaluate(fn, arg)) return true; await sleep(100); }
  return false;
}
const st = (p) => p.evaluate(() => {
  const n = window.__narration, s = n.state(), a = n.audio;
  return { clip: s.clip, chain: s.chain, here: s.here, rate: s.rate, t: a.currentTime, paused: a.paused, dur: a.duration || 0, pr: a.playbackRate, title: document.getElementById('pl-title').textContent };
});
/* the wave as rendered: which word the timings put under the voice now, and which word is lit hardest */
const waveNow = (p) => p.evaluate(() => {
  const n = window.__narration, s = n.state();
  if (!s.clip) return { k: -1, top: -1, n: 0, stroke: 0, kids: false };
  const list = [...document.querySelectorAll(`.tx[data-clip="${s.clip}"] .w`)], T = n.TIMES[s.clip], ms = n.audio.currentTime * 1000;
  let k = -1; while (k + 1 < T.length && T[k + 1] <= ms) k++;
  const lit = list.map((w, i) => [i, parseFloat(w.style.getPropertyValue('--w')) || 0]).filter((x) => x[1] > 0);
  const top = lit.reduce((a, b) => (b[1] > a[1] ? b : a), [-1, 0]);
  return { k, top: top[0], n: lit.length, stroke: top[0] >= 0 ? parseFloat(getComputedStyle(list[top[0]]).webkitTextStrokeWidth) || 0 : 0, kids: list.some((w) => w.children.length > 0) };
});

try {
  /* ── 1 · structure ─────────────────────────────────────────────────────── */
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(URL, { waitUntil: 'load' });
  await sleep(400);
  check('page renders without console errors', errors.length === 0, errors.slice(0, 2).join(' | '));

  const S = await page.evaluate(() => {
    const dock = document.getElementById('dock'), cs = getComputedStyle(dock), n = window.__narration;
    const fixed = [...document.querySelectorAll('body *')].filter((e) => getComputedStyle(e).position === 'fixed');
    const cogEl = document.getElementById('af-cog'), cog = cogEl?.getBoundingClientRect();
    const right = Math.max(...[...dock.querySelectorAll('button, input, .pl-time')].filter((e) => !e.closest('.af-chrome')).map((e) => e.getBoundingClientRect().right));
    const secs = n ? n.ORDER.map((clip) => {
      const tx = document.querySelector(`.tx[data-clip="${clip}"]`), T = n.TIMES[clip] || [];
      return { clip, dur: n.DURS[clip], times: T.length, words: tx ? tx.querySelectorAll('.w').length : -1, rising: T.every((v, i) => !i || v >= T[i - 1]),
        listen: !!document.querySelector(`.listen[data-clip="${clip}"]`), say: !!(tx && [...tx.querySelectorAll(':scope > p')].some((q) => q.textContent.trim())),
        figs: tx ? tx.querySelectorAll(':scope > .fig').length : 0,
        text: tx ? [...tx.querySelectorAll('.w')].map((w) => (w.classList.contains('n') ? (w.getAttribute('data-say') || '') : w.textContent)).join(' ') : '',   /* what the voice says: a number pair speaks its data-say */
        pairs: tx ? [...tx.querySelectorAll('.w.n')].map((w) => ({ shown: w.textContent, say: w.getAttribute('data-say') || '' })) : [] };
    }) : [];
    const toc = document.getElementById('toc');
    const mis = [...document.querySelectorAll('#toc .ti')].map((ti) => ({ id: ti.dataset.target, icon: !!ti.querySelector('.ti-ico svg'), play: !!ti.querySelector('.ti-play'), sec: !!document.querySelector(`section.sec[id="${ti.dataset.target}"]`) }));
    const iconOnly = ['playall', 'gonext'].map((id) => { const b = document.getElementById(id); return { id, ok: !!b && !b.textContent.trim() && !!b.querySelector('svg') && !!b.title && !!b.getAttribute('aria-label'), title: b ? b.title : '' }; });
    const dh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dock-h'));
    const margins = [...document.querySelectorAll('section.sec')].map((s) => parseFloat(getComputedStyle(s).scrollMarginTop));
    const foots = mis.map((m) => document.querySelector(`section.sec[id="${m.id}"] .next-btn`)?.dataset.goto || null);
    return { hook: !!n, position: cs.position, fixed: fixed.map((e) => e.id || e.className || e.tagName), cogInDock: !!cogEl && dock.contains(cogEl), clear: cog ? right <= cog.left - 4 : false, right: Math.round(right), cogLeft: cog ? Math.round(cog.left) : -1,
      secs, mis, tocHidden: !!toc && toc.hidden && getComputedStyle(toc).display === 'none', iconOnly, dh, dockH: dock.offsetHeight, margins, foots, ids: mis.map((m) => m.id), overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  check('the narration engine is on the page (window.__narration)', S.hook);
  check('the dock is sticky in the flow, not fixed', S.position === 'sticky', S.position);
  check('nothing on the page is fixed; the cog rides in the dock', S.fixed.length === 0 && S.cogInDock, S.fixed.length ? `fixed: ${S.fixed.slice(0, 3).join(', ')}` : 'cog in #dock');
  check('the dock\'s controls end before the cog', S.clear, `controls end at ${S.right}px, cog at ${S.cogLeft}px`);
  check('the sections menu lists every narrated section, each iconed, playable and pointing at its section', S.mis.length === S.secs.length && S.mis.every((m) => m.icon && m.play && m.sec), `${S.mis.length} rows · ${S.secs.length} clips`);
  check('the sections menu is hidden until asked (the [hidden] rule is in the page)', S.tocHidden);
  check('Play all and Next are icons, named on hover and to a screen reader', S.iconOnly.every((b) => b.ok), S.iconOnly.map((b) => `${b.id}: ${b.title.split(' · ')[0] || 'no title'}`).join(' · '));
  check('every clip has a duration, a listen row and its script on the page', S.secs.every((s) => s.dur > 0 && s.listen && s.say), S.secs.filter((s) => !(s.dur > 0 && s.listen && s.say)).map((s) => s.clip).join(', '));
  check('every section lands its script on at least one figure', S.secs.every((s) => s.figs > 0), S.secs.map((s) => `${s.clip} ${s.figs}`).join(' · '));
  check('one rising timing per transcript word, in every clip', S.secs.every((s) => s.times === s.words && s.rising), S.secs.filter((s) => s.times !== s.words || !s.rising).map((s) => `${s.clip} ${s.times}≠${s.words}`).join(', '));
  const dirty = S.secs.filter((s) => /\d|[\/\\`_{}<>|#@=*~^$%+]/.test(s.text)).map((s) => s.clip + ': ' + (s.text.match(/\d+|[\/\\`_{}<>|#@=*~^$%+]/) || [''])[0]);
  check('the spoken text carries no digit, id or symbol', dirty.length === 0, dirty.join(', '));
  const pairs = S.secs.flatMap((s) => s.pairs.map((q) => ({ clip: s.clip, ...q })));
  const lame = pairs.filter((q) => !/\d/.test(q.shown) || !q.say.trim() || /\d|[\/\\`_{}<>|#@=*~^$%+]/.test(q.say)).map((q) => `${q.clip}: ${q.shown}`);
  check('every number the page shows carries the words the voice says', lame.length === 0, pairs.length ? (lame.join(', ') || `${pairs.length} pair(s)`) : 'no number pairs');
  check('a jump parks a section below the dock (--dock-h + scroll margin)', Math.abs(S.dh - S.dockH) <= 1 && S.margins.every((m) => m >= S.dockH), `dock ${S.dockH}px, --dock-h ${S.dh}px, smallest margin ${Math.min(...S.margins)}px`);
  check('every section ends in a next button; the last goes back to the top', S.foots.slice(0, -1).every((g, i) => g === S.ids[i + 1]) && S.foots[S.foots.length - 1] === 'top', S.foots.join(' → '));
  check('no horizontal page scroll at 1280px', S.overflow <= 1, `${S.overflow}px`);
  /* at rest — no clip current — a moving stage shows its FINISHED frame and holds still: it never animates on load or
     on scroll into view (operator 2026-10-05: "when we are not reproducing transcriptions, they should go to the final
     state"). Each stage is scrolled into view and sampled at uneven gaps; then replayed through window.FXREPLAY and left
     to settle — the frame a replay settles on is the finished frame, and it must be the frame the stage rested on. */
  await page.evaluate(() => {
    window.__fp = (el) => [el, ...el.querySelectorAll('*')].map((e) => {
      const r = e.getBoundingClientRect(), c = getComputedStyle(e);
      return [Math.round(r.width), Math.round(r.height), c.opacity, c.transform, c.backgroundColor].join(',');
    }).join('|') + '#' + el.textContent;
  });
  const stages = await page.evaluate(() => [...document.querySelectorAll('.tx .fig [data-fx]')].map((e) => e.getAttribute('data-fx')));
  const restFP = {}, restBad = [];
  for (const slug of stages) {
    const sel = `.tx .fig [data-fx="${slug}"]`, fpOf = () => page.evaluate((q) => window.__fp(document.querySelector(q)), sel);
    await page.evaluate((q) => document.querySelector(q).scrollIntoView({ block: 'center', behavior: 'instant' }), sel);
    const a = [];
    for (const gap of [150, 550, 1200]) { await sleep(gap); a.push(await fpOf()); }
    let settled = a[0];
    if (await page.evaluate((k) => !!(window.FXREPLAY && window.FXREPLAY[k]), slug)) {
      await page.evaluate((k) => window.FXREPLAY[k](), slug);
      let prev = null;
      for (let i = 0; i < 16; i++) { await sleep(500); const cur = await fpOf(); if (cur === prev) break; prev = cur; }
      settled = prev;
    }
    restFP[slug] = a[0];
    if (!a.every((x) => x === a[0])) restBad.push(`${slug} moves at rest`);
    else if (settled !== a[0]) restBad.push(`${slug} rests on a frame its replay does not end on`);
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  check('at rest a moving figure shows its finished frame and holds still', restBad.length === 0,
    stages.length ? (restBad.join(' · ') || `${stages.length} stage(s)`) : 'no moving stage on this page');

  /* ── 2 · the sections menu ─────────────────────────────────────────────── */
  const tm = () => page.evaluate(() => { const t = document.getElementById('toc'), b = document.getElementById('toc-btn'); return { open: getComputedStyle(t).display !== 'none', exp: b.getAttribute('aria-expanded'), focusIn: t.contains(document.activeElement), focusBtn: document.activeElement === b, row: [...t.querySelectorAll('.ti-go')].indexOf(document.activeElement) }; });
  await page.click('#toc-btn'); await sleep(80);
  const m0 = await tm();
  check('the menu button opens the menu and moves focus into it', m0.open && m0.exp === 'true' && m0.focusIn);
  await page.keyboard.press('ArrowDown'); await sleep(60);
  const m1 = await tm();
  check('the arrow keys walk the rows', m1.row === m0.row + 1, `row ${m0.row} → ${m1.row}`);
  await page.keyboard.press('Escape'); await sleep(80);
  const me = await tm();
  check('Escape closes it and returns focus to the menu button', !me.open && me.focusBtn && me.exp === 'false');
  await page.click('#toc-btn'); await sleep(80);
  /* the left gutter, outside the column at any width */
  await page.mouse.click(8, page.viewportSize().height - 8); await sleep(80);
  check('an outside click closes it', !(await tm()).open);
  await page.click('#toc-btn'); await sleep(80);
  await page.click('#af-cog'); await sleep(80);
  const withCog = await page.evaluate(() => document.getElementById('af-panel').getAttribute('data-open') === 'true');
  check('opening the cog closes the menu (one panel at a time)', !(await tm()).open && withCog);
  await page.keyboard.press('Escape'); await sleep(80);
  const third = Math.min(2, S.ids.length - 1);
  const settle = async () => { for (let y = -1, i = 0; i < 50; i++) { await sleep(120); const now = await page.evaluate(() => scrollY); if (now === y) break; y = now; } };
  await page.click('#toc-btn'); await sleep(80);
  await page.click(`#toc .ti[data-target="${S.ids[third]}"] .ti-go`);
  /* wait for the smooth scroll to settle, not a fixed time — a page of clips runs to 18k px, and a 5k px jump
     takes Chrome ~1.3 s; a fixed 1.1 s sleep measured it mid-flight */
  await settle();
  const where = (id) => page.evaluate((id) => { const top = document.getElementById(id).getBoundingClientRect().top, d = document.getElementById('dock').offsetHeight, ti = document.querySelector(`#toc .ti[data-target="${id}"]`); return { top: Math.round(top), d, cur: ti.dataset.current, aria: ti.querySelector('.ti-go').getAttribute('aria-current'), count: document.getElementById('toc-cur').textContent.trim() }; }, id);
  const landed = await where(S.ids[third]);
  check('a menu row lands its section just under the dock', landed.top >= landed.d - 2 && landed.top <= landed.d + 48, `top ${landed.top}px, dock ${landed.d}px`);
  check('the scrollspy marks it current (data-current + aria-current) and the button counts it', landed.cur === 'true' && landed.aria === 'location' && landed.count === `${third + 1} / ${S.ids.length}`, `"${landed.count}"`);
  if (third + 1 < S.ids.length) {
    await page.click('#gonext'); await settle();
    const nx = await where(S.ids[third + 1]);
    check('Next goes to the following section', nx.top >= nx.d - 2 && nx.top <= nx.d + 48 && nx.cur === 'true', `top ${nx.top}px, ${nx.count}`);
    await page.click(`#toc-btn`); await sleep(80);
    await page.click(`#toc .ti[data-target="${S.ids[third]}"] .ti-go`); await settle();
  }

  /* ── 3 · the player ────────────────────────────────────────────────────── */
  const ORDER = S.secs.map((s) => s.clip);
  await page.click('#pl-play');
  const started = await until(page, () => window.__narration.audio.currentTime > 0.4);
  let s = await st(page);
  check('play starts the clip of the section in view, and the audio advances', started && s.clip === ORDER[third], `clip ${s.clip}, t ${s.t.toFixed(2)}s`);
  check('the dock names the playing section', s.title && s.title !== 'Nothing playing · press play', s.title);
  /* the figure under the voice: seek (through the dock's own bar) to the first word of a paragraph that has a figure */
  const target = await page.evaluate((c) => {
    const n = window.__narration, fig = document.querySelector(`.tx[data-clip="${c}"] > .fig`);
    if (!fig) return null;
    const p = fig.dataset.p, list = [...document.querySelectorAll(`.tx[data-clip="${c}"] .w`)];
    const k = list.indexOf(document.querySelector(`.tx[data-clip="${c}"] > p[data-p="${p}"] .w`));
    return { p, frac: (n.TIMES[c][k] + 200) / 1000 / (n.audio.duration || n.DURS[c]) };
  }, s.clip);
  if (target) {
    await page.evaluate((f) => { const k = document.getElementById('pl-seek'); k.value = Math.round(f * 1000); k.dispatchEvent(new Event('input', { bubbles: true })); }, target.frac);
    await sleep(500);
  }
  const lv = await page.evaluate((c) => ({ key: window.__narration.state().live, live: [...document.querySelectorAll('.fig[data-live="true"]')].map((f) => `${f.closest('.tx').dataset.clip}:${f.dataset.p}`) }), s.clip);
  check('the figure tied to the paragraph under the voice goes live, and only it', !!target && lv.key === `${s.clip}:${target.p}` && lv.live.length > 0 && lv.live.every((k) => k === lv.key),
    target ? `live ${lv.live.join(', ') || 'none'} · voice in ${lv.key}` : `no figure in ${s.clip}`);
  await sleep(900);
  const w1 = await waveNow(page);
  check('the wave lights the word the timings put under the voice', w1.top >= 0 && Math.abs(w1.top - w1.k) <= 2, `lit ${w1.top}, timed ${w1.k}`);
  check('the wave carries the neighbours too (a crest, not one word)', w1.n >= 2 && w1.n <= 9, `${w1.n} words lit`);
  check('the crest is drawn as a stroke on ONE copy of each word', w1.stroke > 0 && !w1.kids, `stroke ${w1.stroke}px`);
  await page.evaluate(() => { const k = document.getElementById('pl-seek'); k.value = 500; k.dispatchEvent(new Event('input', { bubbles: true })); });
  await sleep(500); s = await st(page);
  check('the dock seek bar moves the audio', s.dur > 0 && Math.abs(s.t / s.dur - 0.5) < 0.06, `${(100 * s.t / (s.dur || 1)).toFixed(1)}% of ${s.dur.toFixed(1)}s`);
  const other = ORDER[third === 1 ? 0 : 1];
  await page.evaluate((c) => { const k = document.querySelector(`.listen[data-clip="${c}"] .seek`); k.value = 250; k.dispatchEvent(new Event('input', { bubbles: true })); }, other);
  await until(page, (c) => { const n = window.__narration; return n.state().clip === c && n.audio.duration > 0 && n.audio.currentTime > 0; }, other);
  await sleep(300); s = await st(page);
  check("dragging another section's bar plays that clip from there", s.clip === other && Math.abs(s.t / (s.dur || 1) - 0.25) < 0.06, `clip ${s.clip} at ${(100 * s.t / (s.dur || 1)).toFixed(1)}%`);
  await page.click('#pl-restart'); await sleep(350); s = await st(page);
  check('restart takes the section back to its start', s.clip === other && s.t < 1.2, `t ${s.t.toFixed(2)}s`);
  await page.click('#pl-rate'); await sleep(100);
  const r1 = await st(page);
  await page.click('#pl-next'); await until(page, () => window.__narration.audio.currentTime > 0.2); s = await st(page);
  const nextOfOther = ORDER[ORDER.indexOf(other) + 1];
  check('speed changes the playback rate', r1.pr === 1.15 && r1.rate === 1.15, `${r1.pr}×`);
  check('next plays the next section, at the chosen speed', s.clip === nextOfOther && s.pr === 1.15, `clip ${s.clip}, ${s.pr}×`);
  for (let i = 0; i < 3; i++) await page.click('#pl-rate');
  await page.click('#pl-prev'); await sleep(350); s = await st(page);
  check('previous, early in a clip, plays the section before', s.clip === other, `clip ${s.clip}`);
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.keyboard.press('Space'); await sleep(200);
  const sp1 = (await st(page)).paused;
  await page.keyboard.press('Space'); await sleep(250);
  const sp2 = (await st(page)).paused;
  check('the space bar pauses and resumes', sp1 === true && sp2 === false);
  await until(page, () => window.__narration.audio.currentTime > 0.6);
  await page.evaluate(() => window.__setMotion && window.__setMotion(false)); await sleep(350);
  const wm = await waveNow(page);
  await page.evaluate(() => window.__setMotion && window.__setMotion(true));
  check('Motion: Paused narrows the wave to the current word', wm.n === 1, `${wm.n} lit`);
  /* script v3: seek a section's own bar to a cue word whose next cue is well clear — the figure takes that step,
     the part it names reads "now", every named part carries a place, and an earlier part reads "past" */
  const cueAt = await page.evaluate(() => {
    const n = window.__narration;
    for (const clip of n.ORDER) {
      const C = n.CUES[clip] || [], T = n.TIMES[clip];
      for (let j = 0; j < C.length; j++) {
        const q = C[j], nextT = j + 1 < C.length ? T[C[j + 1].i] : Infinity;
        if (q.k >= 2 && nextT - T[q.i] > 1800) return { clip, fig: q.fig, k: q.k, frac: (T[q.i] + 180) / 1000 / n.DURS[clip] };
      }
    }
    return null;
  });
  if (!cueAt) {
    check('a cue word steps its figure (script v3)', false, 'no cue with a step of 2 or more, clear of the next — add [[fig:k]] cues');
  } else {
    await page.evaluate((q) => { const k = document.querySelector(`.listen[data-clip="${q.clip}"] .seek`); k.value = Math.round(q.frac * 1000); k.dispatchEvent(new Event('input', { bubbles: true })); }, cueAt);
    await until(page, (c) => { const n = window.__narration; return n.state().clip === c && n.audio.currentTime > 0; }, cueAt.clip);
    await sleep(250);
    const cs = await page.evaluate((q) => {
      const f = document.querySelector(`.fig[data-fig="${q.fig}"]`), parts = [...f.querySelectorAll('[data-k]')];
      return { step: f.getAttribute('data-step'), steps: window.__narration.state().steps, now: parts.filter((e) => e.dataset.at === 'now').length,
        past: parts.filter((e) => e.dataset.at === 'past').length, placed: parts.every((e) => !!e.dataset.at), parts: parts.length };
    }, cueAt);
    check('a cue word steps its figure: the named part is "now", earlier parts "past" (script v3)',
      cs.step === String(cueAt.k) && cs.steps[cueAt.fig] === cueAt.k && cs.now >= 1 && cs.past >= 1 && cs.placed,
      `${cueAt.clip} · ${cueAt.fig} step ${cs.step} of cue ${cueAt.k} · ${cs.now} now, ${cs.past} past of ${cs.parts}`);
  }
  /* play resets (operator 2026-10-05: "when we play the transcription, it should reset to the original state"): play a
     clip from its start — a figure it cues sits on its FIRST frame until its cue word: step 0, every part waiting, and a
     moving stage inside it off its finished frame. A figure with a moving stage is preferred, so the stage is proved too. */
  const ahead = await page.evaluate(() => {
    const n = window.__narration, cands = [];
    for (const clip of n.ORDER) {
      const C = n.CUES[clip] || [], T = n.TIMES[clip], first = {};
      C.forEach((q) => { if (!(q.fig in first)) first[q.fig] = T[q.i]; });
      Object.keys(first).forEach((f) => { if (first[f] > 2500) cands.push({ clip, fig: f, at: first[f], fx: !!document.querySelector(`.fig[data-fig="${f}"] [data-fx]`) }); });
    }
    return cands.find((c) => c.fx) || cands[0] || null;
  });
  if (!ahead) {
    check('play resets a cued figure to its first frame until its cue', false, 'no cued figure more than 2.5 s into its clip');
  } else {
    await page.evaluate((c) => { const k = document.querySelector(`.listen[data-clip="${c}"] .seek`); k.value = 1; k.dispatchEvent(new Event('input', { bubbles: true })); }, ahead.clip);
    await until(page, (c) => { const n = window.__narration; return n.state().clip === c && n.audio.currentTime > 0; }, ahead.clip);
    await sleep(400);
    const r0 = await page.evaluate((q) => {
      const f = document.querySelector(`.fig[data-fig="${q.fig}"]`), parts = [...f.querySelectorAll('[data-k]')];
      return { step: f.getAttribute('data-step'), t: window.__narration.audio.currentTime * 1000, parts: parts.length,
        next: parts.filter((e) => e.dataset.at === 'next').length,
        st: [...f.querySelectorAll('[data-fx]')].map((e) => ({ slug: e.getAttribute('data-fx'), fp: window.__fp(e) })) };
    }, ahead);
    const unreset = r0.st.filter((x) => x.fp === restFP[x.slug]).map((x) => x.slug);
    check('play resets a cued figure to its first frame until its cue (step 0, every part waiting, a moving stage off its finished frame)',
      r0.t < ahead.at && r0.step === '0' && r0.next === r0.parts && r0.parts > 0 && unreset.length === 0,
      `${ahead.clip} · ${ahead.fig} step ${r0.step} at ${(r0.t / 1000).toFixed(1)}s, cue at ${(ahead.at / 1000).toFixed(1)}s · ${r0.next}/${r0.parts} waiting`
      + (r0.st.length ? ` · ${r0.st.length} stage(s) ${unreset.length ? 'still finished: ' + unreset.join(', ') : 'reset'}` : ''));
  }
  await page.click('#pl-stop'); await sleep(250); s = await st(page);
  const whole = await page.evaluate(() => document.querySelectorAll('.fig[data-step], [data-at]').length);
  check('stop returns every cued figure whole (no step, no part dimmed)', whole === 0, `${whole} still stepped`);
  /* a widget settles back to its finished frame on its own clock (bars ease, counters climb): poll for it, bounded — a figure that never gets there still fails */
  let back = [];
  for (let waited = 0; waited <= 3000; waited += 150) {
    await sleep(150); back = [];
    for (const slug of stages) if (await page.evaluate((q) => window.__fp(document.querySelector(q)), `.tx .fig [data-fx="${slug}"]`) !== restFP[slug]) back.push(slug);
    if (!back.length) break;
  }
  check('stop returns every moving figure to its finished frame', back.length === 0, stages.length ? (back.length ? `not finished: ${back.join(', ')}` : `${stages.length} stage(s)`) : 'no moving stage on this page');
  const w0 = await waveNow(page);
  const litAfterStop = await page.evaluate(() => [...document.querySelectorAll('.w')].filter((w) => w.style.getPropertyValue('--w')).length);
  check('stop pauses, clears the clip and unlights every word', s.paused && s.clip === null && s.title.startsWith('Nothing playing') && litAfterStop === 0 && w0.n === 0);
  await page.click('#pl-top'); await until(page, () => window.__narration.audio.currentTime > 0.2); s = await st(page);
  check('start over plays the first section and chains', s.clip === ORDER[0] && s.chain, `clip ${s.clip}, chain ${s.chain}`);
  await until(page, () => window.__narration.audio.duration > 0);
  await page.evaluate(() => { const a = window.__narration.audio; a.currentTime = Math.max(0, a.duration - 0.6); });
  const chained = await until(page, (c) => window.__narration.state().clip === c && window.__narration.audio.currentTime > 0.1, ORDER[1], 8000);
  check('Play all chains into the next section when a clip ends', chained, `now ${(await st(page)).clip}`);
  await page.click('#pl-stop');
  await page.close();

  /* ── 4 · reduced motion ────────────────────────────────────────────────── */
  const rctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const rp = await rctx.newPage();
  await rp.goto(URL, { waitUntil: 'load' }); await sleep(300);
  await rp.click('#pl-play'); await until(rp, () => window.__narration.audio.currentTime > 1.0);
  const wr = await waveNow(rp);
  check('reduced motion lights the current word only', wr.n === 1 && Math.abs(wr.top - wr.k) <= 1, `${wr.n} lit`);
  await rctx.close();

  /* ── 5 · the phone, and the floor ──────────────────────────────────────── */
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await phone.goto(URL, { waitUntil: 'load' }); await sleep(300);
  const ph = await phone.evaluate(() => ({ overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, dock: document.getElementById('dock').offsetHeight }));
  check('no horizontal page scroll at 390px', ph.overflow <= 1, `${ph.overflow}px`);
  check('the dock keeps the phone screen readable (≤ 30% of its height)', ph.dock <= 844 * 0.3, `${ph.dock}px`);
  /* the bug this pins: a phone rule squaring every dock icon to 32px squeezed "3 / 7" under Play all */
  const clash = await phone.evaluate(() => {
    const els = [...document.querySelectorAll('#dock .dk-icon, #dock .pl-btn, #dock .af-cog, #dock .pl-now')].filter((e) => e.offsetParent !== null);
    const R = els.map((e) => ({ id: e.id || e.className.split(' ')[0], r: e.getBoundingClientRect() }));
    const out = [];
    for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) {
      const a = R[i].r, b = R[j].r;
      if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) out.push(`${R[i].id}×${R[j].id}`);
    }
    /* …and none spills out of its own box: the squeezed button's boxes never touched, its "3 / 7" ran over the next */
    els.filter((e) => e.tagName === 'BUTTON').forEach((e) => {   /* buttons only: the title clips to an ellipsis by design */
      const g = document.createRange(); g.selectNodeContents(e);
      const c = g.getBoundingClientRect(), r = e.getBoundingClientRect();
      if (c.width && (c.left < r.left - 1 || c.right > r.right + 1)) out.push(`${e.id || e.className.split(' ')[0]} spills ${Math.round(Math.max(r.left - c.left, c.right - r.right))}px`);
    });
    const t = document.getElementById('pl-title');
    return { out, n: R.length, title: Math.round(t.getBoundingClientRect().width) };
  });
  check('no dock control overlaps another or spills out of its box on the phone', clash.out.length === 0, clash.out.length ? clash.out.slice(0, 3).join(', ') : `${clash.n} controls`);
  check('what is playing keeps a readable width on the phone (≥ 120px)', clash.title >= 120, `${clash.title}px`);
  await phone.click('#toc-btn'); await sleep(80);
  const fit = await phone.evaluate(() => { const r = document.getElementById('toc').getBoundingClientRect(); return { ok: r.left >= 0 && r.right <= window.innerWidth && r.bottom <= window.innerHeight, l: Math.round(r.left), r: Math.round(r.right), b: Math.round(r.bottom) }; });
  await phone.keyboard.press('Escape');
  check('the sections menu opens inside the phone screen', fit.ok, `${fit.l}–${fit.r}px, bottom ${fit.b}px`);
  const small = await phone.evaluate(() => {
    const out = [];
    document.querySelectorAll('#dock *, .tx *, .listen *, .sec-foot *').forEach((e) => {
      if (e.closest('.af-chrome')) return;   /* the cog's panel is chrome and sets its own labels (chrome gate, H6) */
      if (![...e.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())) return;
      const px = parseFloat(getComputedStyle(e).fontSize);
      if (px < 12) out.push(`${e.className || e.tagName} ${px}px`);
    });
    return out;
  });
  check('nothing in the dock or the transcript falls under 12px', small.length === 0, small.slice(0, 3).join(', '));
  await phone.close();
} catch (e) {
  console.error('the gate could not finish: ' + (e && e.stack || e));
  /* a page broken badly enough to stop the run (a menu that never closes blocks the outside click)
     still shows how far it got — and INCOMPLETE is never read as a pass */
  const ran = results.filter((r) => r.ok).length;
  console.log(`\nINCOMPLETE  ${ran}/${results.length} checks passed before the run stopped — ${target}`);
  await browser.close(); server.close();
  process.exit(2);
}

await browser.close();
server.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed — ${target}`);
process.exit(failed.length ? 1 : 0);
