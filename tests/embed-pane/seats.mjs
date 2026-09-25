/* seats.mjs — the board's two SEATS, measured in a real browser on a BUILT centre (D-043 · D-046).
 *
 * usage: node seats.mjs <mode>[@<tag>]=<board.html> …   (one browser, the pages in turn; a tag names a run in every
 *        line it prints — `full@exact S5 …` — so one pass can carry several mutated copies)
 *
 *   full     a fixture with git history and a LEDGER (tests/embed-pane/seatfix.py):
 *     S1  0 page errors · 0 console errors · no 'seat failed'
 *     S2  the changes seat draws ONE pane, full width; its picker offers min(data-cap, GABE_COMMITS.length)
 *     S3  five switches — the first fired BEFORE the grammar's preload finished — leave one canvas, ONE live
 *         WebGL context (every other one lost) and no "Too many active WebGL contexts"
 *     S4  the spine's columns are GABE_SPINE.order, each lists that beat's entries, the newest preselected
 *     S5  every ●/○ equals a prefix join recomputed here from the page's own data (the fixture's inner-piece
 *         token reads ○ — a SUBSTRING join would light it), a ledger token whose length differs from the
 *         feed's `short` (7 vs 8) DRAWS — a join on `short` would miss it — and the spine head counts the
 *         drawable entries the join finds
 *     S6  an undrawable pick says 'not in the feed' (the pill and the changes head) and keeps the pane;
 *         the changes picker then restores its own head
 *     S7  folding the board intro (the ▾ by the title) never hides the seats
 *     S8  an embed that throws says 'seat failed' in the head and the row and marks nothing drawn; picking
 *         the same commit again RETRIES and draws it
 *   empty    a fixture with no git: the changes seat says 'commits.js carries no commits' in head AND row,
 *            no canvas; the spine keeps its five columns and says why it is empty
 *   missing  a copy with assets/3d-bundle.js removed: the changes seat NAMES the file, the spine still renders
 *            and its head says nothing can be drawn, and why — never 'pick'
 *   stub     a copy whose commits.js is the honest-empty stub beside a populated LEDGER: every spine entry ○,
 *            the spine head says none is drawable because commits.js carries no commits — never 'pick'
 *   measure  load-to-ready on a real centre, reported and never judged (D-043's revisit trigger)
 *
 * Every count is read from the page (GABE_COMMITS · GABE_SPINE · data-cap), never a number written here. Heavy
 * (WebGL on swiftshader): run alone.
 */
import path from 'path';

const { chromium } = await import('../../skills/gabe-docsite/tools/_playwright.mjs');   // the suite's portable resolver
const runs = process.argv.slice(2).map((a) => { const i = a.indexOf('=');
  return { mode: a.slice(0, i).split('@')[0], name: a.slice(0, i), file: path.resolve(a.slice(i + 1)) }; });
if (!runs.length || runs.some((r) => !['full', 'empty', 'missing', 'stub', 'measure'].includes(r.mode))) {
  console.error('usage: node seats.mjs <full|empty|missing|stub|measure>[@<tag>]=<board.html> …'); process.exit(2);
}
let pass = 0, fail = 0;
const t = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${extra ? '  — ' + extra : ''}`); }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ORDER = ['RED', 'EXECUTE', 'REVIEW', 'COMMIT', 'PUSH'];

/* before any page script: count WebGL contexts, stamp the first canvas in the changes seat, and (full) fire
   one switch in the SAME task that booted the seats — a MutationObserver runs at that task's end, before any
   glyph of the preload has loaded, so the first pane is still queued (its Graph null) when it is switched */
const INIT = (preswitch) => `(() => {
  const S = window.__seat = { ready: null, ctx: [], pre: null };
  const gc = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (k) {
    const c = gc.apply(this, arguments);
    if (/webgl/.test(String(k)) && c && S.ctx.indexOf(c) < 0) S.ctx.push(c);   /* every context, to count the LIVE ones */
    return c;
  };
  new MutationObserver(() => {
    const host = document.querySelector('[data-seat="commits"]');
    if (!host) return;
    if (S.ready == null && host.querySelector('canvas')) S.ready = performance.now();
    const sel = host.querySelector('select.seat-pick'), pk = host.__pick;
    if (${preswitch} && !S.pre && sel && pk && sel.options.length > 1) {
      const p = pk.pane();
      S.pre = { beforeReady: !!p && !p.Graph, from: host.getAttribute('data-picked') };
      sel.value = '1'; sel.dispatchEvent(new Event('change'));
      S.pre.to = host.getAttribute('data-picked');
    }
  }).observe(document, { childList: true, subtree: true });
})();`;

/* the join, recomputed from page data: a token (≥7, lowercased) that prefixes exactly one commit's full sha,
   inside the picker's window */
const JOIN = `(tok, C, cap) => { const s = String(tok || '').toLowerCase(); if (s.length < 7) return -1;
  const hits = C.map((c, i) => String(c.sha).toLowerCase().startsWith(s) ? i : -1).filter((i) => i >= 0);
  return hits.length === 1 && hits[0] < cap ? hits[0] : -1; }`;

const b = await chromium.launch({
  executablePath: process.env.GABE_CHROME_BIN || '/usr/bin/google-chrome-stable',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'],
});
try {
  for (const { mode, name: N, file } of runs) {
    console.log(`  ── ${N}: ${file}`);
    const pg = await b.newPage({ viewport: { width: 1400, height: 1000 } });
    const errs = [], cerrs = [], warns = [];
    pg.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
    pg.on('console', (m) => {
      const x = m.text();
      if (/too many active webgl contexts/i.test(x)) warns.push(x.slice(0, 160));
      if (m.type() === 'error') cerrs.push(x.slice(0, 200));
    });
    await pg.addInitScript(INIT(mode === 'full'));
    await pg.goto('file://' + file, { waitUntil: 'load' });
    /* booted = the spine head left the page's static fallback (_a3_seats.FALLBACK) — seats.js ran. It is the last
       deferred script, so by 'load' it has run or never will: the wait is a pad, not a race */
    const booted = await pg.waitForFunction(() => { const s = document.querySelector('[data-seat="spine"] .seat-hd > span');
      return !!s && !s.textContent.startsWith('needs spine.js'); }, null, { timeout: mode === 'measure' ? 5000 : 10000 }).then(() => true, () => false);
    /* ready = the changes seat's first pane has a canvas — or the seat said it never will (nor will a page
       that never booted) */
    if (booted) await pg.waitForFunction(() => { const h = document.querySelector('[data-seat="commits"]');
      return window.__seat.ready != null || !h || /carries no commits|cannot draw|seat failed/.test(h.textContent); }, null, { timeout: 60000 }).catch(() => {});
    const tm = await pg.evaluate(() => { const n = performance.getEntriesByType('navigation')[0] || {};
      return { dcl: Math.round(n.domContentLoadedEventEnd || 0), load: Math.round(n.loadEventEnd || 0),
               ready: window.__seat.ready == null ? null : Math.round(window.__seat.ready),
               commits: (window.GABE_COMMITS || []).length, cap: +((document.querySelector('[data-seat="commits"]') || { getAttribute: () => 0 }).getAttribute('data-cap') || 0) }; });
    console.log(`  load-to-ready (${N}): DOMContentLoaded ${tm.dcl} ms · load ${tm.load} ms · the changes seat's first pane ${tm.ready == null ? 'never drew' : tm.ready + ' ms'} · ${tm.commits} commit(s) in commits.js, cap ${tm.cap}`);
    if (mode === 'measure') {
      const heads = await pg.evaluate(() => [...document.querySelectorAll('[data-seat]')].map((s) => s.dataset.seat + ': ' + s.querySelector('.seat-hd > span').textContent)
        .concat([...document.querySelectorAll('[data-seat="spine"] .sp-col')].map((c) => c.dataset.beat.toLowerCase() + ' ' + c.querySelector('.sp-hd .n').textContent)));
      heads.forEach((h) => console.log('    ' + h));
      console.log(`  (measure only — ${errs.length} page error(s), ${cerrs.length} console error(s), ${warns.length} context warning(s), booted ${booted})`);
      await pg.close(); continue;
    }
    t(`${N} S0 the seats booted (the spine head left its static fallback)`, booted);

    if (mode === 'full') {
      /* S2 — one pane, full width, the picker's length from the page's own data */
      const s2 = await pg.evaluate(() => { const host = document.querySelector('[data-seat="commits"]'), row = host.querySelector('.seat-row');
        const sel = host.querySelector('.seat-hd select.seat-pick'), pane = row.firstElementChild;
        return { canvases: host.querySelectorAll('canvas').length, opts: sel ? sel.options.length : -1, mode: host.getAttribute('data-mode'),
                 want: Math.min(+host.getAttribute('data-cap'), (window.GABE_COMMITS || []).length),
                 w: pane ? Math.round(pane.getBoundingClientRect().width) : 0, rowW: Math.round(row.getBoundingClientRect().width) }; });
      t(N + ' S2 the changes seat draws one pane, full width, and offers min(data-cap, GABE_COMMITS.length) commits',
        s2.canvases === 1 && s2.mode === 'pick' && s2.want > 1 && s2.opts === s2.want && s2.w >= s2.rowW * 0.9, JSON.stringify(s2));

      /* S3 — the pre-READY switch the init script fired, then four more */
      const s3 = await pg.evaluate(async () => {
        const host = document.querySelector('[data-seat="commits"]'), sel = host.querySelector('select.seat-pick'), n = sel.options.length;
        const drawn = async () => { const t0 = Date.now(); while (!(host.__pick.pane() || {}).Graph && Date.now() - t0 < 15000) await new Promise((r) => setTimeout(r, 50)); };
        await drawn();
        const picked = [];
        for (let k = 0; k < 4; k++) {
          sel.value = String((sel.selectedIndex + 1) % n); sel.dispatchEvent(new Event('change'));
          await drawn(); picked.push(host.getAttribute('data-picked'));
        }
        await new Promise((r) => setTimeout(r, 600));
        return { pre: window.__seat.pre, picked, last: window.GABE_COMMITS[+sel.value].short, now: host.getAttribute('data-picked'),
                 canvases: document.querySelectorAll('canvas').length, drew: !!(host.__pick.pane() || {}).Graph,
                 made: window.__seat.ctx.length, live: window.__seat.ctx.filter((c) => !c.isContextLost()).length };
      });
      /* one canvas proves only that the DOM was cleared: a pane removed without GabePane.destroy leaves its context
         alive until the collector finds it — so the LIVE contexts are counted too */
      t(N + ' S3 a switch fired before the preload finished, then four more: one canvas, one live WebGL context, the last pick drawn',
        !!s3.pre && s3.pre.beforeReady && s3.pre.to !== s3.pre.from && s3.canvases === 1 && s3.live === 1 && s3.made >= 4 && s3.drew && s3.now === s3.last, JSON.stringify(s3));
      t(N + ' S3 no "Too many active WebGL contexts" after the switches', warns.length === 0, warns[0] || '');

      /* S4 — the spine's columns, counts and preselection, all from GABE_SPINE */
      const s4 = await pg.evaluate(() => { const S = window.GABE_SPINE, cols = [...document.querySelectorAll('[data-seat="spine"] .sp-col')];
        return { beats: cols.map((c) => c.dataset.beat), order: S.order,
                 counts: cols.map((c) => { const s = c.querySelector('select'); return s ? s.options.length : 0; }), want: cols.map((c) => (S.beats[c.dataset.beat] || []).length),
                 pre: cols.map((c) => c.dataset.sha), newest: cols.map((c) => ((S.beats[c.dataset.beat] || [])[0] || { sha: '' }).sha) }; });
      t(N + ' S4 the spine holds GABE_SPINE.order (RED · EXECUTE · REVIEW · COMMIT · PUSH), each column lists its beat, the newest preselected',
        JSON.stringify(s4.beats) === JSON.stringify(ORDER) && JSON.stringify(s4.order) === JSON.stringify(ORDER)
        && JSON.stringify(s4.counts) === JSON.stringify(s4.want) && s4.want.some((n) => n > 0) && JSON.stringify(s4.pre) === JSON.stringify(s4.newest), JSON.stringify(s4));

      /* S5 — every ●/○ against the recomputed join; then draw a token whose length differs from `short` */
      const s5 = await pg.evaluate(async (JOIN) => {
        const join = eval(JOIN), C = window.GABE_COMMITS, S = window.GABE_SPINE, host = document.querySelector('[data-seat="commits"]');
        const cap = Math.min(+host.getAttribute('data-cap'), C.length), bad = [];
        const head = document.querySelector('[data-seat="spine"] .seat-hd > span').textContent;
        let target = null, nlive = 0;
        for (const col of document.querySelectorAll('[data-seat="spine"] .sp-col')) {
          const rows = S.beats[col.dataset.beat] || [], sel = col.querySelector('select');
          rows.forEach((r, i) => {
            const k = (r.shas || [r.sha]).map((s) => join(s, C, cap)).find((x) => x >= 0);
            const live = k !== undefined, dot = sel.options[i].textContent.startsWith('●');
            if (live) nlive++;
            if (live !== dot) bad.push(col.dataset.beat + ':' + r.sha);
            if (live && !target && r.sha.length !== C[k].short.length) target = { col, i, sha: r.sha, want: C[k].short };
          });
        }
        if (!target) return { bad, head, nlive, target: null };
        const sel = target.col.querySelector('select');
        sel.value = String(target.i); sel.dispatchEvent(new Event('change'));
        const t0 = Date.now();
        while (!((host.__pick.pane() || {}).Graph && host.getAttribute('data-picked') === target.want) && Date.now() - t0 < 15000) await new Promise((r) => setTimeout(r, 50));
        return { bad, head, nlive, token: target.sha, want: target.want, picked: host.getAttribute('data-picked'), live: target.col.dataset.live,
                 pill: target.col.querySelector('.sp-live').textContent, canvases: document.querySelectorAll('canvas').length };
      }, JOIN);
      t(N + ' S5 every spine ●/○ equals the prefix join recomputed from GABE_COMMITS', s5.bad.length === 0, 'mismatched: ' + s5.bad.join(' '));
      t(N + ' S5 a ledger token of another length than `short` draws by prefix', !!s5.token && s5.picked === s5.want && s5.live === '1'
        && s5.pill === 'in the feed' && s5.canvases === 1, JSON.stringify(s5));
      t(N + ' S5 the spine head counts the drawable entries the join finds, and invites a pick', s5.nlive > 0
        && s5.head.includes(' · ' + s5.nlive + ' drawable — pick a ●'), JSON.stringify({ head: s5.head, nlive: s5.nlive }));

      /* S6 — an undrawable pick keeps the pane and says so; the picker then restores its own head */
      const s6 = await pg.evaluate(async () => {
        const host = document.querySelector('[data-seat="commits"]'), span = host.querySelector('.seat-hd > span');
        for (const col of document.querySelectorAll('[data-seat="spine"] .sp-col')) {
          const sel = col.querySelector('select'), i = sel ? [...sel.options].findIndex((o) => o.textContent.startsWith('○')) : -1;
          if (i < 0) continue;
          const kept = host.getAttribute('data-picked');
          sel.value = String(i); sel.dispatchEvent(new Event('change'));
          await new Promise((r) => setTimeout(r, 300));
          const out = { sha: col.dataset.sha, live: col.dataset.live, pill: col.querySelector('.sp-live').textContent, head: span.textContent,
                        kept, picked: host.getAttribute('data-picked'), canvases: host.querySelectorAll('canvas').length };
          const ps = host.querySelector('select.seat-pick');
          ps.value = String((ps.selectedIndex + 1) % ps.options.length); ps.dispatchEvent(new Event('change'));
          await new Promise((r) => setTimeout(r, 300));
          out.after = span.textContent;
          return out;
        }
        return null;
      });
      t(N + ' S6 an undrawable spine pick says "not in the feed" and keeps the pane', !!s6 && s6.live === '0' && s6.pill === 'not in the feed'
        && /not in the feed/.test(s6.head) && s6.head.includes('does not carry ' + s6.sha) && s6.picked === s6.kept && s6.canvases === 1, JSON.stringify(s6));
      t(N + ' S6 the changes picker restores its own head after an undrawable pick', !!s6 && !/does not carry/.test(s6.after) && /pick one/.test(s6.after), s6 && s6.after);

      /* S7 — the intro fold hides the lede and the KPIs, never the seats (a pane measures its width ONCE, at mount;
         mounted hidden, it falls back to 900 px and never reflows) */
      const s7 = await pg.evaluate(async () => {
        const btn = document.querySelector('.desctoggle'), seats = document.querySelector('.seats');
        if (!btn) return { btn: false };
        btn.click(); await new Promise((r) => setTimeout(r, 150));
        const cv = document.querySelector('[data-seat="commits"] canvas');
        const out = { btn: true, folded: document.querySelector('.subjecthead').classList.contains('desc-min'), seatsH: Math.round(seats.getBoundingClientRect().height),
                      canvasW: cv ? Math.round(cv.getBoundingClientRect().width) : 0, lede: getComputedStyle(document.querySelector('.pagehead p')).display };
        btn.click();
        return out;
      });
      t(N + ' S7 folding the intro hides the lede, never the seats', s7.btn && s7.folded && s7.lede === 'none' && s7.seatsH > 100 && s7.canvasW > 100, JSON.stringify(s7));

      /* S8 — an embed that throws (the runtime's own, swapped for one pick): the seat says so and marks NOTHING
         drawn, so the same pick again retries — a seat that recorded the failed pick as drawn would skip it */
      const s8 = await pg.evaluate(async () => {
        const host = document.querySelector('[data-seat="commits"]'), sel = host.querySelector('select.seat-pick');
        const span = host.querySelector('.seat-hd > span'), row = host.querySelector('.seat-row'), real = window.GabePane.embed;
        const k = (sel.selectedIndex + 1) % sel.options.length;
        window.GabePane.embed = function () { throw new Error('probe: the embed refused'); };
        sel.value = String(k); sel.dispatchEvent(new Event('change'));
        const failed = { head: span.textContent, row: row.textContent, picked: host.getAttribute('data-picked'), canvases: host.querySelectorAll('canvas').length };
        window.GabePane.embed = real;
        sel.dispatchEvent(new Event('change'));   /* the same commit again */
        const t0 = Date.now();
        while (!(host.__pick.pane() || {}).Graph && Date.now() - t0 < 15000) await new Promise((r) => setTimeout(r, 50));
        return { failed, want: window.GABE_COMMITS[k].short, picked: host.getAttribute('data-picked'), head: span.textContent,
                 drew: !!(host.__pick.pane() || {}).Graph, canvases: host.querySelectorAll('canvas').length };
      });
      t(N + ' S8 an embed that throws says "seat failed" in the head AND the row, and marks nothing drawn',
        /seat failed: probe/.test(s8.failed.head) && /seat failed: probe/.test(s8.failed.row) && s8.failed.picked === null && s8.failed.canvases === 0, JSON.stringify(s8));
      t(N + ' S8 picking the same commit again retries it, and it draws', s8.drew && s8.picked === s8.want && s8.canvases === 1 && !/seat failed/.test(s8.head), JSON.stringify(s8));
    }

    if (mode === 'empty') {
      const e = await pg.evaluate(() => { const host = document.querySelector('[data-seat="commits"]'), S = window.GABE_SPINE;
        const cols = [...document.querySelectorAll('[data-seat="spine"] .sp-col')];
        return { head: host.querySelector('.seat-hd > span').textContent, row: host.querySelector('.seat-row').textContent,
                 canvases: document.querySelectorAll('canvas').length, pick: !!host.querySelector('select.seat-pick'), commits: (window.GABE_COMMITS || null),
                 beats: cols.map((c) => c.dataset.beat), opts: cols.map((c) => c.querySelectorAll('option').length), reason: S && S.reason,
                 spineHead: document.querySelector('[data-seat="spine"] .seat-hd > span').textContent }; });
      t(N + ' E1 "commits.js carries no commits" in the head AND the row, no picker, no canvas',
        Array.isArray(e.commits) && e.commits.length === 0 && /commits\.js carries no commits/.test(e.head) && /commits\.js carries no commits/.test(e.row)
        && !e.pick && e.canvases === 0, JSON.stringify(e));
      t(N + ' E2 the spine keeps its five columns, each empty, and its head says why',
        JSON.stringify(e.beats) === JSON.stringify(ORDER) && e.opts.every((n) => n === 0)
        && /no ledger row of the five beats carries a commit/.test(e.spineHead) && (!e.reason || e.spineHead.includes(e.reason)), JSON.stringify(e));
    }

    if (mode === 'missing') {
      const m = await pg.evaluate(() => { const host = document.querySelector('[data-seat="commits"]'), S = window.GABE_SPINE;
        const cols = [...document.querySelectorAll('[data-seat="spine"] .sp-col')];
        return { head: host.querySelector('.seat-hd > span').textContent, row: host.querySelector('.seat-row').textContent,
                 canvases: document.querySelectorAll('canvas').length, bundle: !!window.ForceGraph3D,
                 beats: cols.map((c) => c.dataset.beat), counts: cols.map((c) => c.querySelectorAll('option').length),
                 want: cols.map((c) => (S.beats[c.dataset.beat] || []).length),
                 spineHead: document.querySelector('[data-seat="spine"] .seat-hd > span').textContent }; });
      t(N + ' M1 the changes seat names the file it lacks, in the head AND the row, and draws nothing',
        !m.bundle && /cannot draw/.test(m.head) && m.head.includes('assets/3d-bundle.js') && m.row.includes('assets/3d-bundle.js') && m.canvases === 0, JSON.stringify(m));
      t(N + ' M2 the spine still renders every beat', JSON.stringify(m.beats) === JSON.stringify(ORDER)
        && JSON.stringify(m.counts) === JSON.stringify(m.want) && m.want.some((n) => n > 0), JSON.stringify(m));
      t(N + ' M3 the spine head says none is drawable and names the missing file — never "pick"', /none drawable/.test(m.spineHead)
        && m.spineHead.includes('assets/3d-bundle.js') && !/pick/.test(m.spineHead), m.spineHead);
    }

    if (mode === 'stub') {
      const st = await pg.evaluate(() => { const host = document.querySelector('[data-seat="commits"]'), S = window.GABE_SPINE;
        const cols = [...document.querySelectorAll('[data-seat="spine"] .sp-col')], opts = [...document.querySelectorAll('[data-seat="spine"] option')];
        return { head: host.querySelector('.seat-hd > span').textContent, row: host.querySelector('.seat-row').textContent,
                 commits: (window.GABE_COMMITS || null), canvases: document.querySelectorAll('canvas').length,
                 beats: cols.map((c) => c.dataset.beat), counts: cols.map((c) => c.querySelectorAll('option').length),
                 want: cols.map((c) => (S.beats[c.dataset.beat] || []).length), lit: opts.filter((o) => o.textContent.startsWith('●')).length,
                 spineHead: document.querySelector('[data-seat="spine"] .seat-hd > span').textContent }; });
      t(N + ' T1 commits.js written empty: the changes seat says "commits.js carries no commits" in the head AND the row, no canvas',
        Array.isArray(st.commits) && st.commits.length === 0 && /commits\.js carries no commits/.test(st.head) && /commits\.js carries no commits/.test(st.row)
        && st.canvases === 0, JSON.stringify(st));
      t(N + ' T2 the spine lists every entry ○, and its head says none is drawable because commits.js carries none — never "pick"',
        JSON.stringify(st.beats) === JSON.stringify(ORDER) && JSON.stringify(st.counts) === JSON.stringify(st.want) && st.want.some((n) => n > 0)
        && st.lit === 0 && /none drawable — commits\.js carries no commits/.test(st.spineHead) && !/pick/.test(st.spineHead), JSON.stringify(st));
    }

    /* S1 — last, so every switch above is inside it. A missing file is a console error by design in 'missing' */
    const failed = await pg.evaluate(() => [...document.querySelectorAll('[data-seat]')].some((s) => /seat failed/.test(s.textContent)));
    const cx = cerrs.filter((x) => !(mode === 'missing' && /Failed to load resource/.test(x)));
    t(`${N} S1 0 page errors · 0 console errors · no "seat failed"`, errs.length === 0 && cx.length === 0 && !failed,
      [...errs, ...cx].slice(0, 3).join(' | ') + (failed ? ' | seat failed' : ''));
    await pg.close();
  }
} catch (e) {
  fail++; console.log('  FAIL  the run aborted — ' + String(e).slice(0, 240));
} finally {
  await b.close();
}
console.log(`seats headless: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
