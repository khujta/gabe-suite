/* gabe-artifact · chrome gate
 *
 * Proves an artifact page carries working house chrome before it is published:
 * the cog exists top-right and stays in reach, the panel opens, every roster
 * option — family, text size, spacing — actually changes the rendered type,
 * Escape closes, the choices survive a reload, panels carry no accent rail, and
 * the content column is centred (text set left inside it) with no sideways body scroll.
 *
 * Usage:  node tools/verify-artifact-chrome.mjs [path/to/page.html]
 * Default target: ../assets/artifact-chrome.html
 *
 * Playwright resolution is borrowed from gabe-docsite (E4 — one resolver for
 * the whole suite). Override with PLAYWRIGHT_DIR=/path/to/node_modules/playwright.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const target = resolve(process.argv[2] || resolve(HERE, '../assets/artifact-chrome.html'));

const { chromium } = await import(new globalThis.URL('../../gabe-docsite/tools/_playwright.mjs', import.meta.url).href).catch(() => import(`${process.env.HOME}/.claude/skills/gabe-docsite/tools/_playwright.mjs`));   // the suite's sibling path, else the installed suite (a project fork)

const html = await readFile(target, 'utf8');
// Serve over http so localStorage behaves as it does on the published page. A sibling the
// page loads (a demo's read-aloud.js) is served from beside it; answering it with the page
// itself threw "Unexpected token '<'" and failed the console check on a page that was fine.
const ROOT = dirname(target);
const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = createServer(async (req, res) => {
  const path = decodeURIComponent((req.url || '/').split('?')[0]);
  if (path !== '/') {
    const file = normalize(join(ROOT, path));
    if (file.startsWith(ROOT + '/')) {
      try { const body = await readFile(file); res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' }); res.end(body); return; } catch { /* fall through */ }
    }
    res.writeHead(404); res.end(); return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/`;

const results = [];
const check = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(url, { waitUntil: 'load' });

check('page renders without console errors', errors.length === 0, errors.slice(0, 2).join(' | '));

/* ── cog: present, fixed, top-right ─────────────────────────────────────── */
const cog = page.locator('#af-cog');
check('cog button present', (await cog.count()) === 1);

const cogBox = await cog.boundingBox();
const vw = 1280;
check(
  'cog sits in the top-right corner',
  !!cogBox && cogBox.x > vw * 0.75 && cogBox.y < 120,
  cogBox ? `x=${Math.round(cogBox.x)} y=${Math.round(cogBox.y)}` : 'no box',
);
/* The cog may float (position: fixed) or ride in a sticky bar with the player
   (operator 2026-10-05) — either way it must still be on screen,
   top-right, after the reader scrolls a long way down. */
/* A page shorter than the window cannot scroll, and an absolute cog then passes for a fixed one — so the gate
   adds 3000px of floor and jumps instantly (smooth scroll would still be travelling when it measures). */
await page.evaluate(() => {
  const pad = document.createElement('div'); pad.id = '__gate-pad'; pad.style.height = '3000px';
  document.body.appendChild(pad);
  window.scrollTo({ top: 2400, behavior: 'instant' });
});
await page.waitForTimeout(150);
const cogLow = await cog.boundingBox();
const cogHome = await cog.evaluate((el) => {
  for (let n = el.parentElement; n; n = n.parentElement) {
    const p = getComputedStyle(n).position;
    if (p === 'fixed' || p === 'sticky') return p + (n.id ? '#' + n.id : n.className ? '.' + String(n.className).split(' ')[0] : '');
  }
  return 'in the flow';
});
check('cog stays in reach after scrolling', !!cogLow && cogLow.y >= 0 && cogLow.y < 120 && cogLow.x > vw * 0.75,
  `${cogHome} · y=${cogLow ? Math.round(cogLow.y) : 'none'} after scrolling`);
await page.evaluate(() => { window.scrollTo({ top: 0, behavior: 'instant' }); document.getElementById('__gate-pad')?.remove(); });

/* ── panel opens and closes ─────────────────────────────────────────────── */
check('panel starts closed', !(await page.locator('#af-panel').isVisible()));
await cog.click();
check('panel opens on cog click', await page.locator('#af-panel').isVisible());
check('cog reports expanded', (await cog.getAttribute('aria-expanded')) === 'true');

/* ── every roster option changes the rendered type ──────────────────────── */
const roster = await page.evaluate(() =>
  [...document.querySelectorAll('#af-fonts .af-opt')].map((b) => ({
    id: b.getAttribute('data-id'),
    label: b.querySelector('.af-name')?.textContent ?? '',
    stack: b.querySelector('.af-name')?.style.fontFamily ?? '',
    spec: b.querySelector('.af-spec')?.textContent ?? '',
  })),
);
check('roster has at least two families', roster.length >= 2, `${roster.length} options`);

/* the families' specs are their base at text size 100 — measure them there */
const sizeIds = await page.$$eval('#af-size .af-opt', ns => ns.map(n => n.getAttribute('data-id')));
if (sizeIds.includes('100')) await page.click('#af-size .af-opt[data-id="100"]');

const seen = new Set();
for (const opt of roster) {
  await page.click(`.af-opt[data-id="${opt.id}"]`);
  const applied = await page.evaluate(() => {
    const cs = getComputedStyle(document.body);
    return { family: cs.fontFamily, size: cs.fontSize, track: cs.letterSpacing };
  });
  const head = opt.stack.split(',')[0].replace(/^["']|["']$/g, '').trim();
  const [wantSize, wantTrack] = opt.spec.split('/').map((s) => parseFloat(s));
  const trackPx = parseFloat(applied.track);
  const expectPx = wantSize * wantTrack;
  check(
    `option "${opt.label}" applies its family`,
    applied.family.toLowerCase().includes(head.toLowerCase()),
    `${applied.family}`,
  );
  check(
    `option "${opt.label}" applies ${wantSize}px / ${wantTrack}em`,
    parseFloat(applied.size) === wantSize && Math.abs(trackPx - expectPx) < 0.05,
    `${applied.size} · ${applied.track}`,
  );
  check(
    `option "${opt.label}" is marked checked`,
    (await page.getAttribute(`.af-opt[data-id="${opt.id}"]`, 'aria-checked')) === 'true',
  );
  seen.add(`${applied.family}|${applied.size}|${applied.track}`);
}
check('every option renders differently', seen.size === roster.length, `${seen.size} distinct of ${roster.length}`);

/* ── text size + spacing (operator 2026-10-05) ────────────────
   Each size step multiplies the family's base, steps strictly grow, and each
   spacing step moves the computed line height. A control that marks itself
   checked while the type stays put is the defect this catches. */
const spaceIds = await page.$$eval('#af-space .af-opt', ns => ns.map(n => n.getAttribute('data-id')));
const bodyType = () => page.evaluate(() => {
  const cs = getComputedStyle(document.body);
  return { size: parseFloat(cs.fontSize), lh: parseFloat(cs.lineHeight) };
});
if (!sizeIds.length) {
  console.log('SKIP  text-size checks — page declares no #af-size group');
} else {
  const base = parseFloat(roster[roster.length - 1].spec);
  const got = [];
  for (const id of sizeIds) {
    await page.click(`#af-size .af-opt[data-id="${id}"]`);
    got.push({ id, size: (await bodyType()).size,
      checked: (await page.getAttribute(`#af-size .af-opt[data-id="${id}"]`, 'aria-checked')) === 'true' });
  }
  check('every text size scales the base', got.every(g => Math.abs(g.size - base * (+g.id) / 100) < 0.06),
    got.map(g => `${g.id}%→${g.size}px`).join(' · '));
  check('text sizes strictly grow', got.every((g, i) => !i || g.size > got[i - 1].size), `${got.length} steps`);
  check('the picked size is marked checked', got.every(g => g.checked));
  check('the smallest text size keeps the family base', Math.abs(got[0].size - base) < 0.06, `${got[0].size}px vs ${base}px`);
}
if (!spaceIds.length) {
  console.log('SKIP  spacing checks — page declares no #af-space group');
} else {
  const lhs = [];
  for (const id of spaceIds) {
    await page.click(`#af-space .af-opt[data-id="${id}"]`);
    const t = await bodyType();
    lhs.push({ id, ratio: t.lh / t.size });
  }
  check('every spacing step moves the line height', new Set(lhs.map(l => l.ratio.toFixed(2))).size === lhs.length,
    lhs.map(l => `${l.id} ${l.ratio.toFixed(2)}`).join(' · '));
}

/* ── Escape closes ──────────────────────────────────────────────────────── */
await page.keyboard.press('Escape');
check('Escape closes the panel', !(await page.locator('#af-panel').isVisible()));

/* ── the choice survives a reload ───────────────────────────────────────── */
const last = roster[roster.length - 1];
await cog.click();
await page.click(`.af-opt[data-id="${last.id}"]`);
const lastSize = sizeIds[sizeIds.length - 1], firstSpace = spaceIds[0];
if (lastSize) await page.click(`#af-size .af-opt[data-id="${lastSize}"]`);
if (firstSpace) await page.click(`#af-space .af-opt[data-id="${firstSpace}"]`);
const typeOf = () => page.evaluate(() => {
  const cs = getComputedStyle(document.body);
  return `${cs.fontFamily} | ${cs.fontSize} | ${cs.lineHeight}`;
});
const before = await typeOf();
await page.reload({ waitUntil: 'load' });
const after = await typeOf();
check('family, size and spacing persist across reload', before === after, after.split(' | ').slice(1).join(' · '));

/* ── skins + section blocks (H5) ────────────────────────────────────────────
   Conditional: a page with no #af-skins group reports SKIP, loudly, rather
   than passing silently — older pages predate the skin system. */
const skinRoster = await page.$$eval('#af-skins .af-opt', ns => ns.map(n => n.getAttribute('data-id')));
if (!skinRoster.length) {
  console.log('SKIP  skin checks — page declares no #af-skins group');
} else {
  await cog.click();                       // the reload above closed the panel
  const grounds = [];
  const radii = [];
  for (const id of skinRoster) {
    await page.click(`#af-skins .af-opt[data-id="${id}"]`);
    grounds.push(await page.evaluate(() => getComputedStyle(document.body).backgroundColor));
    radii.push(await page.evaluate(() => {
      const el = document.querySelector('.panel');
      return el ? parseFloat(getComputedStyle(el).borderTopLeftRadius) : NaN;
    }));
  }
  check('every skin paints a distinct ground', new Set(grounds).size === skinRoster.length,
    `${skinRoster.length} skins · ${new Set(grounds).size} grounds`);
  check('no skin has square corners', radii.every(r => Number.isNaN(r) ? true : r >= 4),
    radii.map(r => (Number.isNaN(r) ? 'n/a' : r + 'px')).join(' · '));
  const lastSkin = skinRoster[skinRoster.length - 1];
  await page.reload({ waitUntil: 'load' });
  check('skin selection persists across reload',
    (await page.evaluate(() => document.documentElement.getAttribute('data-skin'))) === lastSkin,
    lastSkin);
}

const panels = await page.$$eval('.panel', ns => ns.length);
if (!panels) {
  console.log('SKIP  rail check — page has no .panel');
} else {
  /* Inverted (operator 2026-10-05): the accent rail down every panel's
     left edge read as AI slop — a mark on everything distinguishes nothing. A panel's
     left border now matches the rest of its frame. */
  const rails = await page.$$eval('.panel', ns => ns.map(n => {
    const cs = getComputedStyle(n);
    return { w: parseFloat(cs.borderLeftWidth), c: cs.borderLeftColor, tw: parseFloat(cs.borderTopWidth), tc: cs.borderTopColor };
  }));
  const railed = rails.filter(r => r.w > 1.5 || r.w !== r.tw || r.c !== r.tc);
  check('panels carry no accent rail', railed.length === 0,
    railed.length ? `${railed.length} of ${rails.length} railed: ${railed[0].w}px ${railed[0].c}` : `${rails.length} panels, left edge = frame`);
}

const heads = await page.$$eval('.sec-head h2', ns => ns.map(h => {
  const c = getComputedStyle(h);
  const r = h.getBoundingClientRect();
  return {
    bg: c.backgroundColor, size: parseFloat(c.fontSize), tt: c.textTransform,
    family: c.fontFamily, radius: parseFloat(c.borderTopLeftRadius), height: r.height,
    track: parseFloat(c.letterSpacing) || 0,
    icons: h.querySelectorAll('svg').length,
  };
}));
if (!heads.length) {
  console.log('SKIP  section-block checks — page has no .sec-head h2');
} else {
  const bodySize = await page.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize));
  const bodyFamily = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  check('section titles sit on a contrasting block',
    heads.every(h => h.bg !== 'rgba(0, 0, 0, 0)'), `${heads.length} titles`);
  check('section blocks are distinct colours',
    new Set(heads.map(h => h.bg)).size === heads.length,
    `${new Set(heads.map(h => h.bg)).size} of ${heads.length}`);
  /* Size and tracking stay guarded; CAPS are now the treatment, not the
     defect (founder ruling 2026-07-31, reversing the earlier uppercase ban —
     what made the old version read "massive" was the size bump beside it). */
  check('section titles stay at normal text size',
    heads.every(h => Math.abs(h.size - bodySize) <= 1.5),
    `${heads[0].size}px vs body ${bodySize}px`);
  check('section titles are set in caps',
    heads.every(h => h.tt === 'uppercase'),
    `${heads.filter(h => h.tt === 'uppercase').length} of ${heads.length}`);
  check('section title tracking stays modest',
    heads.every(h => h.track <= bodySize * 0.08),
    `${heads[0].track.toFixed(2)}px of ${(bodySize * 0.08).toFixed(2)}px allowed`);
  /* H6 — the title system: every title led by an icon, in a pill that hugs
     it, set in the title face. A missing icon or a slab corner is drift. */
  check('every section title carries an icon',
    heads.every(h => h.icons >= 1),
    `${heads.filter(h => h.icons >= 1).length} of ${heads.length} iconed`);
  check('section title blocks are pills, not slabs',
    heads.every(h => h.radius >= h.height / 2 - 0.6),
    `radius ${Math.round(heads[0].radius)}px on ${Math.round(heads[0].height)}px tall`);
  check('section titles use the title face, not the body face',
    heads.every(h => h.family !== bodyFamily),
    `${heads[0].family.split(',')[0]} vs body ${bodyFamily.split(',')[0]}`);
  /* One distinctive treatment on the page, or the distinction is worthless:
     h1 and panel headings read in the CONTENT face. */
  const otherTitles = await page.$$eval('.artifact-page :is(h1, h3, h4)',
    ns => ns.map(n => ({ tag: n.tagName.toLowerCase(), family: getComputedStyle(n).fontFamily })));
  check('other titles stay in the content face',
    otherTitles.every(o => o.family === bodyFamily),
    otherTitles.length
      ? `${otherTitles.filter(o => o.family === bodyFamily).length} of ${otherTitles.length}`
      : 'no h1/h3/h4 on the page');
}

/* The floor is measured at the roster's SMALLEST base — the page must be
   legible in every family it offers, and the loop above left the last option
   applied. Measuring at a 16px base hid an 11.8px table head at 15px. */
const smallest = roster.slice().sort((a, b) => parseFloat(a.spec) - parseFloat(b.spec))[0];
await page.evaluate((id) => {
  const b = document.querySelector(`#af-fonts .af-opt[data-id="${id}"]`);
  if (b) b.click();
  const z = document.querySelector('#af-size .af-opt');          // and the smallest text size
  if (z) z.click();
}, smallest.id);

/* ── H6 · the legibility floor ─────────────────────────────────────────────
   Scoped to .artifact-page: the cog panel is chrome and sets its own labels.
   Anything inside the content column that renders its own text must compute
   at 12px or more — below that a table's status column stops being readable
   before anyone notices it stopped being read. */
const tiny = await page.evaluate(() => {
  const col = document.querySelector('.artifact-page');
  if (!col) return null;
  const out = [];
  // SVG text is authored in viewBox units and RENDERS at units × the svg's
  // display scale — a 10px label in a 360-wide viewBox shown 540px wide reads
  // at 15px. Measuring computed px alone would condemn legible diagram labels
  // and, worse, wave through tiny ones in a shrunk viewBox. So scale it.
  const scaleOf = (n) => {
    const svg = n.ownerSVGElement;
    if (!svg) return 1;
    const vb = svg.viewBox && svg.viewBox.baseVal;
    const w = svg.getBoundingClientRect().width;
    return vb && vb.width && w ? w / vb.width : 1;
  };
  col.querySelectorAll('*').forEach((n) => {
    const own = [...n.childNodes].some(c => c.nodeType === 3 && c.textContent.trim().length > 1);
    if (!own) return;
    const px = parseFloat(getComputedStyle(n).fontSize) * scaleOf(n);
    if (px < 12) {
      const cls = typeof n.className === 'string' && n.className ? '.' + n.className.split(' ')[0] : '';
      out.push(`${n.tagName.toLowerCase()}${cls}@${px.toFixed(1)}px`);
    }
  });
  return out;
});
if (tiny === null) {
  console.log('SKIP  legibility floor — page has no .artifact-page column');
} else {
  check('no content text below the 12px legibility floor',
    tiny.length === 0,
    tiny.length ? `${tiny.length} below floor: ${tiny.slice(0, 3).join(', ')}` : 'smallest ≥ 12px');
}

/* ── scrollbars belong to the skin ─────────────────────────────────────────
   Checked by COMPUTED value, and — the part that matters — re-checked after a
   skin switch. A hardcoded grey bar passes a "is it styled" test and still
   clashes with two of the three skins; only a thumb that MOVES with the theme
   is actually in sync with it. */
const sb = await page.evaluate(() => {
  const cs = getComputedStyle(document.documentElement);
  return { width: cs.scrollbarWidth, color: cs.scrollbarColor };
});
check('scrollbars are styled, not the OS default', sb.width === 'thin' && sb.color !== 'auto',
  `${sb.width} · ${sb.color}`);

if (skinRoster.length > 1) {
  const thumbs = [];
  for (const id of skinRoster) {
    await page.evaluate((s) => window.__setSkin(s), id);
    // computed form is "<thumb> <track>"; the THUMB is the bar you actually see,
    // and comparing the whole pair lets a hardcoded thumb hide behind a track
    // that happens to vary with the skin.
    thumbs.push(await page.evaluate(() => {
      const v = getComputedStyle(document.documentElement).scrollbarColor;
      const parts = v.split(/(?<=\))\s+/);
      return parts[0] || v;
    }));
  }
  check('the scrollbar thumb tracks the skin', new Set(thumbs).size === skinRoster.length,
    `${new Set(thumbs).size} distinct thumb(s) of ${skinRoster.length} skins`);
}

/* ── house layout rules ─────────────────────────────────────────────────── */
const layout = await page.evaluate(() => {
  const col = document.querySelector('.artifact-page');
  const box = col ? col.getBoundingClientRect() : null;
  return {
    align: getComputedStyle(document.body).textAlign,
    left: box ? box.left : -1,
    centred: box ? Math.abs(box.left - (window.innerWidth - box.right)) < 8 : false,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
});
check('body text is left-aligned', ['left', 'start'].includes(layout.align), layout.align);
check('content column is centred, equal air both sides', layout.centred, `left=${Math.round(layout.left)}px`);
check('no horizontal page scroll', layout.overflow <= 1, `overflow=${layout.overflow}px`);

await browser.close();
server.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed — ${target}`);
process.exit(failed.length ? 1 : 0);
