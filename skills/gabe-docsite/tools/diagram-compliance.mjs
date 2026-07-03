/* gabe-docsite — diagram compliance gate.
 *
 * WHY: docs are opened straight off disk (file://). A CDN/ES-module mermaid does
 * NOT run over file://, so diagrams silently degrade to raw `flowchart TD …`
 * source text. This gate loads every generated page over file:// (the way a
 * reader opens it) and asserts each diagram is a rendered, sized <svg> showing
 * no raw mermaid source. An http-server test does not catch this — it must be
 * file://.
 *
 * Usage:  node diagram-compliance.mjs <site-dir>       (default: ../../docs/site)
 * Exit 0 = every diagram on every page renders as SVG · Exit 1 = non-compliant.
 */
import { chromium } from './_playwright.mjs';
import { pathToFileURL } from 'node:url';
import { readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const siteDir = resolve(process.argv[2] || join(process.cwd(), 'site'));
const pages = readdirSync(siteDir).filter(f => f.endsWith('.html'));
if (!pages.length) { console.error(`No .html pages in ${siteDir}`); process.exit(1); }

const browser = await chromium.launch();
const results = [];
for (const file of pages) {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(join(siteDir, file)).href, { waitUntil: 'load' });
  await page.waitForTimeout(2500); // let the vendored classic mermaid render
  const diagrams = await page.evaluate(() => {
    const rawRe = /flowchart\s+(TD|LR|TB|RL)|(^|\s)subgraph\s|-->|==>/;
    return Array.from(document.querySelectorAll('.mermaid, .mermaid-fig, figure[data-mermaid-src]')).map((c, i) => {
      const svg = c.querySelector('svg');
      const box = svg ? svg.getBoundingClientRect() : { width: 0, height: 0 };
      const clone = c.cloneNode(true);
      clone.querySelectorAll('svg').forEach(s => s.remove());
      return { i, hasSvg: !!svg, w: Math.round(box.width), h: Math.round(box.height),
               rawShown: rawRe.test((clone.textContent || '').replace(/\s+/g, ' ').trim()) };
    });
  });
  await page.close();
  const bad = diagrams.filter(d => !d.hasSvg || d.w < 60 || d.h < 40 || d.rawShown);
  results.push({ file, count: diagrams.length, bad });
}
await browser.close();

let failed = 0;
console.log(`\nDIAGRAM COMPLIANCE (file://) — ${siteDir}\n${'='.repeat(52)}`);
for (const r of results) {
  if (!r.count) { console.log(`  [ -- ] ${r.file.padEnd(20)} no diagrams`); continue; }
  const ok = r.bad.length === 0;
  if (!ok) failed++;
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${r.file.padEnd(20)} ${r.count} diagram(s)`);
  for (const d of r.bad) {
    const why = !d.hasSvg ? 'no <svg> — did not render'
      : d.rawShown ? 'raw mermaid source shown as text'
      : `svg too small (${d.w}×${d.h})`;
    console.log(`         ✗ diagram #${d.i}: ${why}`);
  }
}
console.log('='.repeat(52));
const totalDiagrams = results.reduce((n, r) => n + r.count, 0);
console.log(failed === 0
  ? `ALL COMPLIANT — ${totalDiagrams} diagram(s) across ${pages.length} pages render as SVG over file://`
  : `${failed} PAGE(S) NON-COMPLIANT`);
process.exit(failed === 0 ? 0 : 1);
