/* Resolve Playwright's chromium for the dev-time docs build/test tools.
 * The repo has no Node install of its own; these tools borrow any Playwright
 * that is already on the machine. Override explicitly with:
 *   PLAYWRIGHT_DIR=/path/to/node_modules/playwright node tools/<tool>.mjs
 */
const CANDIDATES = [
  process.env.PLAYWRIGHT_DIR,
  '/home/khujta/projects/apps/gastify/node_modules/playwright',
  '/home/khujta/projects/apps/gustify/node_modules/playwright',
].filter(Boolean);

let chromium;
for (const dir of CANDIDATES) {
  try {
    const pw = (await import(dir + '/index.js')).default;
    if (pw?.chromium) { chromium = pw.chromium; break; }
  } catch { /* try next */ }
}
if (!chromium) {
  try { chromium = (await import('playwright')).chromium; } catch { /* not on path */ }
}
if (!chromium) {
  throw new Error('Playwright not found — set PLAYWRIGHT_DIR=/path/to/node_modules/playwright and retry.');
}
export { chromium };
