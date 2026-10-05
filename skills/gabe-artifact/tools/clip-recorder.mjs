/* gabe-artifact · action-clip recorder (script v2)
 *
 * Records a short clip of a Playwright page doing one thing — a click, a drag, a panel opening — so a narrated page
 * can land an idea on the action itself instead of a still. Frames come from CDP Page.startScreencast (lossless enough
 * to read 12px UI text; Playwright's own recordVideo is VP8 at a fixed bitrate and blurs it), each with its timestamp,
 * so the clip keeps the real pacing. A drawn cursor (the headless browser has none) glides between targets and rings
 * on every press, so a viewer sees what was clicked.
 *
 *   import { installCursor, glide, tap, park, startClip } from ".../tools/clip-recorder.mjs"
 *   await installCursor(page)                 // before page.goto — survives navigations
 *   const rec = await startClip(page, "room-open", FRAMES_DIR)
 *   await tap(page, page.getByTestId("sim-open-tick"))
 *   await rec.stop({ x, y, width, height })   // the crop, CSS px; frames + frames.json land in FRAMES_DIR/room-open/
 *
 * Then encode, one clip at a time (the WSL2 rule): python3 tools/clip-encode.py FRAMES_DIR/room-open out/room-open.mp4
 * and delete the frames once the clip is good. Headless Chromium's screencast arrives at CSS-pixel size whatever the
 * deviceScaleFactor, so record at 1 and crop to ≤ ~1240 px wide — the page shows a clip at its own size. (A clip whose
 * frames really are 2× — clip-encode prints the scale — is named <name>@2x.mp4; the builder halves it.)
 * Spec: references/narration.md §9.
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const CURSOR = `(() => {
  if (window.__gaCursor) return; window.__gaCursor = true;
  function mk() {
    var c = document.createElement("div"), r = document.createElement("div");
    c.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M4 2l16 10-7 1.6L9.6 21z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    c.style.cssText = "position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;transform:translate(-200px,-200px);filter:drop-shadow(0 1px 2px rgba(0,0,0,.5))";
    r.style.cssText = "position:fixed;left:0;top:0;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:3px solid #f5b400;z-index:2147483646;pointer-events:none;opacity:0;transform:translate(-200px,-200px)";
    var tip = document.createElement("div");
    tip.style.cssText = "position:fixed;left:0;top:0;z-index:2147483645;pointer-events:none;display:none;max-width:340px;padding:5px 9px;border-radius:6px;background:#1f2430;color:#f1f3f7;border:1px solid #4b5263;font:12.5px/1.35 system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.45)";
    document.documentElement.append(tip, r, c);
    /* a native title tooltip never paints in a screencast; with titles on, the clip paints the same text itself */
    var tx = 0, ty = 0, timer = 0;
    function showTip() {
      var el = document.elementFromPoint(tx, ty), host = el && el.closest("[title]"), s = host && host.getAttribute("title");
      if (!s) { tip.style.display = "none"; return; }
      tip.textContent = s; tip.style.display = "block";
      tip.style.transform = "translate(" + Math.min(tx + 12, innerWidth - tip.offsetWidth - 8) + "px," + (ty + 22) + "px)";
    }
    if (window.__gaTitles) setInterval(function () { if (tip.style.display === "block") showTip(); }, 250);
    addEventListener("mousemove", function (e) {
      c.style.transform = "translate(" + (e.clientX - 3.7) + "px," + (e.clientY - 1.8) + "px)";
      if (!window.__gaTitles) return;
      tx = e.clientX; ty = e.clientY; tip.style.display = "none"; clearTimeout(timer); timer = setTimeout(showTip, 550);
    }, true);
    addEventListener("mousedown", function (e) {
      var at = "translate(" + e.clientX + "px," + e.clientY + "px)";
      r.style.transition = "none"; r.style.opacity = "1"; r.style.transform = at + " scale(.4)";
      requestAnimationFrame(function () { requestAnimationFrame(function () {
        r.style.transition = "opacity .5s ease-out, transform .5s ease-out"; r.style.opacity = "0"; r.style.transform = at + " scale(1.3)";
      }); });
    }, true);
  }
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", mk); else mk();
})();`;

const where = new WeakMap();

/** Draw a cursor that follows the mouse and rings on a press. Call before the first goto. titles: true also paints
 *  the hovered element's title attribute as a tooltip after a short rest (the browser's own never reaches a frame). */
export async function installCursor(page, { titles = false } = {}) {
  if (titles) await page.addInitScript("window.__gaTitles = true;");
  await page.addInitScript(CURSOR);
}

/** Put the cursor somewhere without a glide (before a clip starts). */
export async function park(page, x, y) {
  await page.mouse.move(x, y);
  where.set(page, [x, y]);
}

async function centreOf(target, dx, dy) {
  if (typeof target.boundingBox !== "function") return [target.x, target.y];
  await target.scrollIntoViewIfNeeded();
  const b = await target.boundingBox();
  if (!b) throw new Error("glide: the target has no box (hidden?)");
  return [b.x + b.width / 2 + dx, b.y + b.height / 2 + dy];
}

/** Move the cursor to a locator's centre (or {x, y}) with an ease-in-out, the way a hand moves. */
export async function glide(page, target, { ms = 560, dx = 0, dy = 0 } = {}) {
  const [x, y] = await centreOf(target, dx, dy);
  const [x0, y0] = where.get(page) ?? [x, y];
  const n = Math.max(8, Math.round(ms / 18));
  for (let i = 1; i <= n; i++) {
    const t = i / n, e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    await page.mouse.move(x0 + (x - x0) * e, y0 + (y - y0) * e);
    await page.waitForTimeout(14);
  }
  where.set(page, [x, y]);
  return { x, y };
}

/** Glide, then press and release where the cursor sits; wait for the UI to answer. */
export async function tap(page, target, { after = 750, ...o } = {}) {
  await glide(page, target, o);
  await page.waitForTimeout(180);
  await page.mouse.down();
  await page.waitForTimeout(90);
  await page.mouse.up();
  await page.waitForTimeout(after);
}

/** Glide onto an element, then scroll its nearest scrollable ancestor smoothly by dy — one motion, the way a wheel
 *  flick reads (page.mouse.wheel waits on every notch and turns a 500 px scroll into six seconds). */
export async function scrollOver(page, target, dy, { after = 900 } = {}) {
  await glide(page, target);
  await target.evaluate((el, by) => {
    let s = el;
    while (s && !(s.scrollHeight > s.clientHeight + 2 && /(auto|scroll)/.test(getComputedStyle(s).overflowY))) s = s.parentElement;
    (s || document.scrollingElement).scrollBy({ top: by, behavior: "smooth" });
  }, dy);
  await page.waitForTimeout(after);
}

/** Press, glide to a point while held, release — a slider drag. */
export async function drag(page, from, to, { ms = 1400, after = 700 } = {}) {
  await glide(page, from);
  await page.waitForTimeout(150);
  await page.mouse.down();
  await glide(page, to, { ms });
  await page.mouse.up();
  await page.waitForTimeout(after);
}

/** Start recording the page. stop(crop) ends it and writes <root>/<name>/frames.json beside the frames. */
export async function startClip(page, name, root) {
  const dir = path.join(root, name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  let n = 0;
  cdp.on("Page.screencastFrame", (f) => {
    const file = `f${String(++n).padStart(5, "0")}.jpg`;
    writeFileSync(path.join(dir, file), Buffer.from(f.data, "base64"));
    frames.push({ file, t: f.metadata.timestamp });
    cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
  });
  const viewport = page.viewportSize();
  // ~30 fps at quality 85: a canvas that animates every frame otherwise writes ~13 MB/s of JPEGs into the scratchpad
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 85, maxWidth: viewport.width * 2, maxHeight: viewport.height * 2, everyNthFrame: 2 });
  await page.waitForTimeout(350);   // the first frame lands before the action starts
  return {
    async stop(crop, { hold = 1.8, lead = 0.5 } = {}) {
      await page.waitForTimeout(300);
      await cdp.send("Page.stopScreencast");
      await cdp.detach();
      const c = {
        x: Math.max(0, Math.floor(crop.x)), y: Math.max(0, Math.floor(crop.y)),
        width: Math.ceil(Math.min(crop.width, viewport.width - Math.max(0, crop.x))),
        height: Math.ceil(Math.min(crop.height, viewport.height - Math.max(0, crop.y))),
      };
      writeFileSync(path.join(dir, "frames.json"), JSON.stringify({ name, viewport, crop: c, hold, lead, frames }, null, 1));
      return { frames: frames.length, seconds: frames.length ? frames[frames.length - 1].t - frames[0].t : 0, crop: c };
    },
  };
}

/** The union of several boxes plus a margin — a crop that holds every element the clip is about. */
export async function cropAround(page, targets, margin = 16) {
  const boxes = [];
  for (const t of targets) {
    const b = typeof t.boundingBox === "function" ? await t.boundingBox() : t;
    if (b) boxes.push(b);
  }
  if (!boxes.length) throw new Error("cropAround: no target has a box");
  const x0 = Math.min(...boxes.map((b) => b.x)) - margin, y0 = Math.min(...boxes.map((b) => b.y)) - margin;
  const x1 = Math.max(...boxes.map((b) => b.x + b.width)) + margin, y1 = Math.max(...boxes.map((b) => b.y + b.height)) + margin;
  const vp = page.viewportSize();
  return { x: Math.max(0, x0), y: Math.max(0, y0), width: Math.min(vp.width, x1) - Math.max(0, x0), height: Math.min(vp.height, y1) - Math.max(0, y0) };
}
