/* gabe-artifact · motion gate
 *
 * Proves a page's animation is real before it is published: each animated
 * element is fingerprinted, replayed, re-sampled, and required to have CHANGED;
 * the cog's Motion=Paused must freeze it; reduced motion must render a finished
 * state rather than an empty frame.
 *
 * Usage:  node tools/verify-motion.mjs <path/to/page.html>
 *         node tools/verify-motion.mjs                     (defaults to the pattern library)
 *
 * DISCOVERY, in order:
 *   1. window.FXREPLAY — the registry an artifact's animations register into
 *      ({slug: rebuildFn}); each slug's stage is `[data-fx="<slug>"]`, falling
 *      back to the content column when a fragment does not mark one.
 *   2. `.ex[data-anim]` cards — the pattern library's own shape.
 * A page with neither reports SKIP loudly: nothing to verify is not the same as
 * verified, and must never read as a pass.
 *
 * Two traps this cost us to learn, both still enforced: a fingerprint blind to
 * background-color/border-color reports colour-only animation as frozen, and a
 * sampling window shorter than the animation's own cadence reports a slow loop
 * as dead. FX_WINDOW_MS overrides the window for a page with a slower cadence.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const target = resolve(process.argv[2] || resolve(HERE, '../assets/motion-patterns.html'));
const WINDOW_MS = Number(process.env.FX_WINDOW_MS || 2400);
const SETTLE_MS = Number(process.env.FX_SETTLE_MS || 800);
const USER_DRIVEN = new Set((process.env.FX_USER_DRIVEN || 'scrub,scrolly').split(','));

const { chromium } = await import(new globalThis.URL('../../gabe-docsite/tools/_playwright.mjs', import.meta.url).href).catch(() => import(`${process.env.HOME}/.claude/skills/gabe-docsite/tools/_playwright.mjs`));   // the suite's sibling path, else the installed suite (a project fork)
const html = await readFile(target, 'utf8');
/* `/` is always the page under test; any other path is served from the page's
   own directory. An ARTIFACT is self-contained and never asks for a second
   path, so this changes nothing for it — but a DISK page (gabe-imagine's target)
   loads assets/prism-fx.js, and the old one-file server answered that request
   with the HTML itself. window.FXREPLAY then stayed empty and the gate reported
   a loud SKIP over a page whose animations were fine: an unverified contract
   dressed as an absent one. */
const MIME = { '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
               '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const srv = createServer(async (q, r) => {
  const rel = decodeURIComponent((q.url || '/').split('?')[0]).replace(/^\/+/, '');
  if (!rel) { r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); r.end(html); return; }
  try {
    const buf = await readFile(join(dirname(target), rel));
    r.writeHead(200, { 'Content-Type': MIME[rel.slice(rel.lastIndexOf('.'))] || 'application/octet-stream' });
    r.end(buf);
  } catch { r.writeHead(404); r.end('not found'); }
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${srv.address().port}/`;

const FP = (sel) => {
  const stage = document.querySelector(sel);
  if (!stage) return 'MISSING:' + sel;
  return [...stage.querySelectorAll('*')].map((n) => {
    const r = n.getBoundingClientRect(), c = getComputedStyle(n);
    return [Math.round(r.x * 10), Math.round(r.y * 10), Math.round(r.width * 10), Math.round(r.height * 10),
      c.transform, c.strokeDashoffset, c.opacity, c.r, c.backgroundColor, c.borderColor,
      n.getAttribute('fill'), n.getAttribute('stroke'), n.getAttribute('data-hot'),
      (n.textContent || '').length].join(',');
  }).join('|');
};

let pass = 0, fail = 0, skipped = 0;
const ok = (n, d = '') => { console.log(`PASS  ${n}${d ? '  — ' + d : ''}`); pass++; };
const bad = (n, d = '') => { console.log(`FAIL  ${n}${d ? '  — ' + d : ''}`); fail++; };
const skip = (n) => { console.log(`SKIP  ${n}`); skipped++; };

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 950 } });
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
await p.goto(url, { waitUntil: 'load' });
await p.waitForTimeout(400);

/* ── discovery ──────────────────────────────────────────────────────────── */
const registry = await p.evaluate(() => Object.keys(window.FXREPLAY || {}));
const cards = await p.$$eval('.ex[data-anim]', (ns) => ns.map((n) => n.getAttribute('data-anim')));

/* PRECEDENCE: card discovery wins when cards exist. A card carries its own
   stage element, so each animation is fingerprinted in isolation; the FXREPLAY
   fallback fingerprints the content column, and on a page with several
   animations one moving element would then mark every subject as moving. */
let subjects = [];
if (cards.length) {
  subjects = cards.filter((a) => !USER_DRIVEN.has(a)).map((anim) => ({
    slug: anim,
    stage: `.ex[data-anim="${anim}"] .ex-stage`,
    replay: async () => p.click(`.ex[data-anim="${anim}"] .ex-replay`),
  }));
  console.log(`discovered ${subjects.length} animation card(s) via .ex[data-anim]`);
} else if (registry.length) {
  subjects = registry.map((slug) => ({
    slug,
    stage: `[data-fx="${slug}"]`,
    replay: async () => p.evaluate((s) => window.FXREPLAY[s](), slug),
  }));
  for (const s of subjects) {
    if (!(await p.$(s.stage))) s.stage = (await p.$('.artifact-page')) ? '.artifact-page' : 'body';
  }
  console.log(`discovered ${subjects.length} animation(s) via window.FXREPLAY: ${registry.join(', ')}`);
}

if (!subjects.length) {
  console.log('SKIP  no animation found — the page registers no window.FXREPLAY entry and has no .ex[data-anim] card.');
  console.log('      Nothing to verify is NOT the same as verified. If this page is supposed to move, it is broken.');
  await b.close(); srv.close();
  process.exit(0);
}

/* ── 1 · each animation actually moves after a replay ───────────────────── */
for (const s of subjects) {
  /* A stage selector that matches nothing produced the same "MISSING:…" string
     on every sample, which the loop below reported as FROZEN — a real contract
     error dressed up as an animation bug, and the reader debugs the wrong thing. */
  if (!(await p.$(s.stage))) {
    bad(`${s.slug}: stage selector matched no element`, s.stage);
    continue;
  }
  await s.replay();
  const frames = new Set();
  const STEPS = 6;
  for (let k = 0; k < STEPS; k++) {
    frames.add(await p.evaluate(FP, s.stage));
    await p.waitForTimeout(Math.round(WINDOW_MS / STEPS) + k * 7);   // uneven, to defeat aliasing
  }
  frames.size > 1
    ? ok(`${s.slug} animates after replay`, `${frames.size} distinct frames`)
    : bad(`${s.slug} frozen across ${WINDOW_MS}ms after replay`, s.stage);
}

/* The running render's size per stage — the baseline the reduced-motion check
   compares against. Captured HERE, before any pause toggling: pausing rebuilds
   every animation into its finished state, and on a page whose finished state
   draws less, a baseline taken afterwards would quietly excuse an empty frame. */
const liveNodes = [];
for (const s of subjects) {
  liveNodes.push(await p.evaluate((sel) => {
    const st = document.querySelector(sel);
    return st ? st.querySelectorAll('*').length : 0;
  }, s.stage));
}

/* ── 2 · the cog's pause freezes every one of them ──────────────────────── */
const hasCog = await p.$('#af-motion .af-opt[data-id="off"]');
if (!hasCog) {
  skip('cog Motion group absent — the page cannot honour the pause obligation (H4)');
} else {
  await p.evaluate(() => window.__setMotion(false));
  /* Settle before sampling. Pausing flips elements to their finished state
     through CSS TRANSITIONS (typically 300ms); a sample taken at 250ms catches
     one mid-flight and the next sample, seconds later, sees the settled colour —
     which reads as "still moving" and fails a page that froze correctly. */
  await p.waitForTimeout(SETTLE_MS);
  /* Sample SEVERAL times at uneven gaps, not once before and once after. A
     single pair aliases: a 600ms loop sampled 2400ms apart lands on the exact
     same phase, and an animation that never stopped reports as frozen. The
     gaps below are deliberately non-harmonic. */
  const GAPS = [0, 190, 330, 470, 610, 890];
  const seen = subjects.map(() => new Set());
  for (const g of GAPS) {
    if (g) await p.waitForTimeout(g);
    for (let i = 0; i < subjects.length; i++) seen[i].add(await p.evaluate(FP, subjects[i].stage));
  }
  const moved = subjects.filter((s, i) => seen[i].size > 1).map((s) => s.slug);
  moved.length === 0
    ? ok('cog Motion=Paused freezes every animation', `${subjects.length} checked`)
    : bad('paused, but these kept moving', moved.join(', '));
  await p.evaluate(() => window.__setMotion(true));
}

console.log('page errors:', errs.length ? errs.slice(0, 3) : 'none');
if (errs.length) fail++;
await p.close();

/* ── 3 · reduced motion renders the FINISHED state, and nothing moves ───── */
const rp = await b.newPage({ viewport: { width: 1280, height: 950 }, reducedMotion: 'reduce' });
const rerrs = [];
rp.on('pageerror', (e) => rerrs.push(String(e)));
await rp.goto(url, { waitUntil: 'load' });
await rp.waitForTimeout(500);
const stalled = [], empty = [];
for (let i = 0; i < subjects.length; i++) {
  const s = subjects[i];
  const a = await rp.evaluate(FP, s.stage);
  await rp.waitForTimeout(Math.round(WINDOW_MS / 2));
  const c = await rp.evaluate(FP, s.stage);
  if (a !== c) stalled.push(s.slug);
  /* An empty stage is not only zero nodes. The real failure is a START state:
     the animation renders its first frame — a bare container, half the traces
     undrawn — and stops there. So compare against what the RUNNING page drew:
     substantially less content under reduced motion is a start state, and the
     obligation is the FINISHED one. */
  const nodes = await rp.evaluate((sel) => {
    const st = document.querySelector(sel);
    return st ? st.querySelectorAll('*').length : 0;
  }, s.stage);
  const floorCount = Math.max(1, Math.floor(liveNodes[i] * 0.5));
  if (nodes < floorCount) empty.push(`${s.slug} (${nodes} of ${liveNodes[i]} nodes)`);
}
stalled.length === 0 ? ok('reduced motion: nothing moves', `${subjects.length} checked`)
  : bad('reduced motion: still animating', stalled.join(', '));
empty.length === 0 ? ok('reduced motion: every stage renders its finished state, not a start frame')
  : bad('reduced motion: stage(s) render less than the running page', empty.join(', '));
if (rerrs.length) bad('reduced motion: page errors', rerrs.slice(0, 2).join(' | '));
await rp.close();

await b.close(); srv.close();
console.log(`\n${pass}/${pass + fail} motion checks passed${skipped ? ` (${skipped} skipped)` : ''} — ${target}`);
process.exit(fail ? 1 : 0);
