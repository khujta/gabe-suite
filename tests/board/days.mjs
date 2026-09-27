// days.mjs — open a built board (file://) with the viewer's clock set to a given day, and print what the page shows
// once its own script has counted the days (D-061): the dated chips, the date framings' columns, the two date KPIs and
// the card flags they filter on. The battery (run.sh) asserts on the JSON; this script judges nothing.
//
//   node days.mjs <page.html> <day> [<day> …]      → one JSON line per day
//
// A <day> is YYYY-MM-DD — the viewer's clock reads 12:00 UTC of that day, in timezone UTC — or <ISO instant>@<zone>
// (2026-09-28T02:45:00Z@America/Sao_Paulo): the clock reads that instant and the page runs in that IANA zone, so a
// viewer west of Greenwich can be put at 23:45 of their evening. Date is replaced before any page script runs, so
// "today" is that calendar day wherever the battery runs. Every [data-day] on the page is snapshotted (the board's
// chips, a feature page's Captured cell). A real system chrome (GABE_CHROME_BIN) + the suite's Playwright resolver,
// as tests/embed-pane does.
import path from 'path';
import { pathToFileURL } from 'url';

const { chromium } = await import('../../skills/gabe-docsite/tools/_playwright.mjs');
const [file, ...days] = process.argv.slice(2);
if (!file || !days.length) { console.error('usage: days.mjs <board.html> <YYYY-MM-DD>…'); process.exit(2); }
const exe = process.env.GABE_CHROME_BIN || '/usr/bin/google-chrome-stable';
const browser = await chromium.launch({ executablePath: exe, args: ['--allow-file-access-from-files'] });
let rc = 0;
try {
  for (const day of days) {
    const [at, zone] = day.includes('@') ? day.split('@') : [day + 'T12:00:00Z', 'UTC'];
    const ms = Date.parse(at);
    const ctx = await browser.newContext({ timezoneId: zone });
    await ctx.addInitScript((at) => {
      const Real = Date;
      class Fixed extends Real {
        constructor(...a) { if (a.length) super(...a); else super(at); }
        static now() { return at; }
      }
      window.Date = Fixed;
    }, ms);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e && e.message || e)));
    await page.goto(pathToFileURL(path.resolve(file)).href, { waitUntil: 'load' });
    await page.waitForTimeout(150);
    const snap = await page.evaluate(() => {
      const txt = (el) => (el ? el.textContent.trim() : null);
      const title = (c) => txt(c.querySelector('h4'));
      const chips = {};
      document.querySelectorAll('[data-day]').forEach((el) => {
        const k = el.className.split(' ')[0] + '@' + el.getAttribute('data-day');
        chips[k] = { text: txt(el), title: el.title, cls: el.className };
      });
      const cols = {};
      document.querySelectorAll('.bboard[data-mode="age"], .bboard[data-mode="done"]').forEach((b) => {
        const m = b.getAttribute('data-mode');
        cols[m] = { pool: b.querySelectorAll('.bpool').length, cols: {} };
        b.querySelectorAll('.bcol').forEach((col) => {
          cols[m].cols[col.getAttribute('data-col')] = {
            n: txt(col.querySelector('h3 .n')),
            cards: [...col.querySelectorAll('.bcard')].map(title),
            folded: col.querySelectorAll('.bfold .bcard').length,
            more: txt(col.querySelector('.bmore')),
            rp: txt(col.querySelector('header .rp')),
            mix: txt(col.querySelector('header .mix')),
            empty: txt(col.querySelector('.bempty')),
          };
        });
      });
      const kpis = {};
      document.querySelectorAll('.kpi').forEach((k) => {
        kpis[txt(k.querySelector('.lab'))] = { val: txt(k.querySelector('.val')), sub: txt(k.querySelector('.sub')),
                                               alert: k.classList.contains('alert') };
      });
      const flags = {};
      document.querySelectorAll('.bboard[data-mode="age"] .bcard, .bboard[data-mode="done"] .bcard').forEach((c) => {
        flags[title(c)] = { closed30: c.getAttribute('data-closed30'), aged: c.getAttribute('data-aged') };
      });
      const words = [];
      document.querySelectorAll('.bboard .bcard, .kpis').forEach((el) => {
        const m = el.textContent.match(/\b(ago|today|yesterday)\b/i);
        if (m) words.push(m[0]);
      });
      return { chips, cols, kpis, flags, words };
    });
    snap.day = day; snap.errors = errors;
    console.log(JSON.stringify(snap));
    await ctx.close();
  }
} catch (e) {
  console.error('days.mjs: ' + (e && e.stack || e));
  rc = 1;
} finally {
  await browser.close();
}
process.exit(rc);
