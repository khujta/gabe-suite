/* destroy.mjs — GabePane.destroy, measured in a real browser against the SHIPPED runtime (D-045).
 *
 * A seat that switches subjects mounts a new pane and destroys the old one. The browser keeps about
 * sixteen live WebGL contexts and then drops the OLDEST — a pane still on screen goes blank — so a
 * teardown that only removes the DOM is not a teardown. Each case measures the contract itself:
 *
 *   D1  a pane destroyed before the grammar's glyph preload finishes never draws once READY fires
 *   D2  20 × mount → destroy leaves at most one canvas on the page
 *   D3  the first pane's context is LOST the moment it is destroyed (canvas count alone proves only DOM removal)
 *   D4  a hop cell clicked after destroy mints no new WebGL context and brings no graph back
 *   D5  the console skin's shared tip, lit when the pane goes, is hidden by the destroy
 *   D6  0 page errors · D7  no "Too many active WebGL contexts" warning
 *   D8  a dispose that throws still loses the context — the loss is the one guarantee, so it never
 *       shares a try with force-graph's _destructor
 *
 * The subject is read from the feed at run time (the first GABE_COMMITS entry whose slice draws) —
 * never a hard-coded sha.   usage: node destroy.mjs <harness.html>
 */
import path from 'path';

const { chromium } = await import('../../skills/gabe-docsite/tools/_playwright.mjs');   // the suite's portable resolver
const harness = path.resolve(process.argv[2] || new URL('harness.html', import.meta.url).pathname);
let pass = 0, fail = 0;
const t = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${extra ? '  — ' + extra : ''}`); }
};

const b = await chromium.launch({
  executablePath: process.env.GABE_CHROME_BIN || '/usr/bin/google-chrome-stable',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'],
});
try {
  const pg = await b.newPage({ viewport: { width: 1200, height: 900 } });
  const errs = [], warns = [];
  pg.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  pg.on('console', m => { const x = m.text(); if (/too many active webgl contexts/i.test(x)) warns.push(x.slice(0, 160)); });
  await pg.goto('file://' + harness);
  await pg.waitForFunction('window.__IX && window.GabePane && window.GabePane.destroy', { timeout: 30000 }).catch(() => {});
  const ready = await pg.evaluate('!!(window.__IX && window.GabePane)');
  t('harness loads the shipped runtime and the example feed', ready);
  if (!ready) throw new Error('the harness never became ready: ' + errs.join(' | '));

  const subj = await pg.evaluate(() => {
    const cs = window.GABE_COMMITS || [];
    for (let i = 0; i < cs.length; i++) {
      const s = GabeSlice.resolve(window.__IX, { scope: 'commit', id: cs[i].short, hops: 1, budget: 24, tier: 1 });
      if (s && s.nodes && s.nodes.length) return { id: cs[i].short, at: i, nodes: s.nodes.length };
    }
    return null;
  });
  t('the feed names a commit whose slice draws', !!subj, 'no GABE_COMMITS entry resolves to a non-empty slice');
  if (!subj) throw new Error('no subject');
  console.log(`  subject: commit ${subj.id} (GABE_COMMITS[${subj.at}], ${subj.nodes} pieces)`);

  const sleep = 'const sleep = ms => new Promise(r => setTimeout(r, ms));';
  const O = `{ ix: window.__IX, scope: 'commit', id: ${JSON.stringify(subj.id)}, size: 'card' }`;

  /* D1 — on a FRESH page the grammar is not ready: the first mount only queues its render */
  const d1 = await pg.evaluate(`(async () => { ${sleep}
    const p = GabePane.embed(document.getElementById('a'), ${O});
    GabePane.destroy(p);                              /* before READY: the queued render must never run */
    const q = GabePane.embed(document.getElementById('b'), ${O});   /* its first frame proves READY fired */
    const t0 = Date.now();
    while (!q.Graph && Date.now() - t0 < 30000) await sleep(100);
    await sleep(400);
    const out = { ready: !!q.Graph, deadCanvas: p.host.querySelectorAll('canvas').length, deadGraph: !!p.Graph, made: window.__glMade };
    GabePane.destroy(q);
    return out; })()`);
  t('D1 a pane destroyed before READY never draws', d1.ready && d1.deadCanvas === 0 && !d1.deadGraph && d1.made === 1, JSON.stringify(d1));

  /* D2 + D3 — twenty seat switches */
  const d2 = await pg.evaluate(`(async () => { ${sleep}
    const host = document.getElementById('a');
    let lost = null;
    for (let k = 0; k < 20; k++) {
      const p = GabePane.embed(host, ${O});
      if (!p.Graph) return { err: 'pane ' + k + ' did not draw' };
      const gl = k === 0 ? p.Graph.renderer().getContext() : null;
      await sleep(60);
      GabePane.destroy(p);
      /* read at ONCE, while only a couple of contexts live: past ~16 the browser evicts the oldest on its
         own, and a late read would credit that eviction to the destroy (seen on the no-op mutant) */
      if (gl) lost = gl.isContextLost();
    }
    await sleep(600);
    return { canvases: document.querySelectorAll('canvas').length, lost: lost }; })()`);
  t('D2 20 × mount → destroy leaves ≤ 1 canvas', !d2.err && d2.canvases <= 1, JSON.stringify(d2));
  t('D3 the destroyed pane\'s WebGL context is lost', !d2.err && d2.lost === true, JSON.stringify(d2));

  /* D4 — a hop cell's handler calls p.render(); after destroy that must draw nothing */
  const d4 = await pg.evaluate(`(async () => { ${sleep}
    const p = GabePane.embed(document.getElementById('a'), ${O});
    const btn = p.wrap && p.wrap.querySelector('.pnc-reach button, .pn-hops button');
    GabePane.destroy(p);
    const before = window.__glMade;
    if (btn) btn.click();
    await sleep(400);
    return { btn: !!btn, made: window.__glMade - before, graph: !!p.Graph, attached: document.body.contains(p.wrap) }; })()`);
  t('D4 a hop click after destroy mints no context and no graph', d4.btn && d4.made === 0 && !d4.graph && !d4.attached, JSON.stringify(d4));

  /* D5 — the tip lives on <body>; a pane destroyed under the pointer never fires mouseleave */
  const d5 = await pg.evaluate(`(async () => { ${sleep}
    const p = GabePane.embed(document.getElementById('a'), ${O});
    const v = p.wrap.querySelector('.pnc-vital');
    if (v) v.dispatchEvent(new MouseEvent('mouseenter'));
    const lit = !!document.querySelector('.pnc-tip.on');
    GabePane.destroy(p);
    await sleep(100);
    return { lit: lit, after: !!document.querySelector('.pnc-tip.on') }; })()`);
  t('D5 the console tip is hidden by the destroy', d5.lit && !d5.after, JSON.stringify(d5));

  /* D8 — force-graph's _destructor empties the scene and disposes controls, renderer and composer; any of
     those can throw on a page's odd state, and a throw must not cost the context */
  const d8 = await pg.evaluate(`(async () => { ${sleep}
    const p = GabePane.embed(document.getElementById('a'), ${O});
    if (!p.Graph) return { err: 'the pane did not draw' };
    const gl = p.Graph.renderer().getContext();
    p.Graph._destructor = function () { throw new Error('dispose threw'); };
    GabePane.destroy(p);
    return { lost: gl.isContextLost(), graph: !!p.Graph, attached: document.body.contains(p.wrap) }; })()`);
  t('D8 a dispose that throws still loses the context', !d8.err && d8.lost === true && !d8.graph && !d8.attached, JSON.stringify(d8));

  t('D6 0 page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  t('D7 no "Too many active WebGL contexts" warning', warns.length === 0, warns[0] || '');
} catch (e) {
  fail++; console.log('  FAIL  the run aborted — ' + String(e).slice(0, 240));
} finally {
  await b.close();
}
console.log(`embed-pane headless: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
