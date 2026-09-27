/* The page counts its own days (D-061).

   The generator writes no wallclock-relative word. Every date a page shows that is not a
   commit's goes into it as an ABSOLUTE date, and this script measures that date against the
   VIEWER's today when the page opens — whole calendar days, "N days" (0 on the day itself),
   never "today", "yesterday" or "ago". A page built once reads right on any later day, and
   its bytes do not move while the tree stands still. No fetch: works on file://.

   The contract (the generators that write it: _a3_board.py · _a3_evidence.py):
     [data-day="YYYY-MM-DD"]            the date — a calendar day, counted as written;
     [data-day="@<epoch seconds>"]      or an INSTANT, counted on the viewer's own calendar day of it (a capture at
                                        22:30 in UTC−3 is that evening's — never the next UTC day's)
       data-day-text="… {d} …"          its text   ({d} → "N days", {date} → the day, YYYY-MM-DD)
       data-day-title="… {d} …"         its tooltip
       data-day-class="a:7 b:30 c"      the first class whose bound holds N, else the unbounded one
     .kpi[data-kpi-days="d1 d2 …"]      a tile counting the dates under data-kpi-rule
       data-kpi-rule="le:30|gt:90"      its value; data-kpi-alert="1" → .alert while it is not 0
       data-kpi-sub + -sub-text         a second count, "{n} …"
       data-kpi-flag + data-kpi-field   the card flag its click filters on (board.js), set on
                                        every .bcard from the card's data-<field> by the same rule
     .bboard[data-days]                 a date framing: its cards ride .bpool, each moved into the
       data-buckets="a:7 b:30 c"        column its distance picks (data-undated: no date), then
       data-cap · data-empty            counted, ripe-marked, track-mixed and folded as the
                                        generator does for every other framing.
   Runs before board.js (script order), which then counts what is visible and filters. */
(function () {
  'use strict';
  var DAY = 86400000;
  var now = new Date();
  var TODAY = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

  function ymd(v) {                        // a data-day value → [y, m0, d]: a date as written, an instant on the viewer's calendar
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || '');
    if (m) return [+m[1], +m[2] - 1, +m[3]];
    m = /^@(-?\d+)$/.exec(v || '');
    if (!m) return null;
    var t = new Date(+m[1] * 1000);
    return [t.getFullYear(), t.getMonth(), t.getDate()];
  }
  function days(v) {                       // whole calendar days from the date to the viewer's today
    var p = ymd(v);
    return p ? Math.round((TODAY - Date.UTC(p[0], p[1], p[2])) / DAY) : null;
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(v) { var p = ymd(v); return p ? p[0] + '-' + pad(p[1] + 1) + '-' + pad(p[2]) : ''; }
  function word(n) { return n + (Math.abs(n) === 1 ? ' day' : ' days'); }
  function fill(tpl, n, v) { return String(tpl).split('{d}').join(word(n)).split('{date}').join(iso(v)); }
  function pick(spec, n) {                 // "a:7 b:30 c" → the first bound that holds n, else the unbounded key
    var open = '', parts = String(spec || '').split(/\s+/);
    for (var i = 0; i < parts.length; i++) {
      if (!parts[i]) continue;
      var kv = parts[i].split(':');
      if (kv.length < 2) { if (!open) open = kv[0]; continue; }
      if (n <= +kv[1]) return kv[0];
    }
    return open;
  }
  function holds(rule, n) {                // "le:30" · "gt:90"
    var kv = String(rule || '').split(':'), b = +kv[1];
    return kv[0] === 'le' ? n <= b : kv[0] === 'gt' ? n > b : false;
  }
  function each(sel, root, fn) { [].forEach.call((root || document).querySelectorAll(sel), fn); }

  /* 1 · every dated element: its text, its tooltip, its class */
  each('[data-day]', null, function (el) {
    var v = el.getAttribute('data-day'), n = days(v);
    if (n === null) return;
    if (el.hasAttribute('data-day-text')) el.textContent = fill(el.getAttribute('data-day-text'), n, v);
    if (el.hasAttribute('data-day-title')) el.title = fill(el.getAttribute('data-day-title'), n, v);
    var cls = pick(el.getAttribute('data-day-class'), n);
    if (cls) el.classList.add(cls);
  });

  /* 2 · the KPI tiles that count days, and the card flag each one filters on */
  each('.kpi[data-kpi-days]', null, function (k) {
    var ns = String(k.getAttribute('data-kpi-days')).split(/\s+/).map(days)
      .filter(function (n) { return n !== null; });
    function count(rule) { return ns.filter(function (n) { return holds(rule, n); }).length; }
    var v = count(k.getAttribute('data-kpi-rule')), val = k.querySelector('.val'), sub = k.querySelector('.sub');
    if (val) val.textContent = String(v);
    if (sub && k.hasAttribute('data-kpi-sub')) {
      sub.textContent = String(k.getAttribute('data-kpi-sub-text') || '{n}')
        .split('{n}').join(String(count(k.getAttribute('data-kpi-sub'))));
    }
    if (k.getAttribute('data-kpi-alert') === '1') k.classList.toggle('alert', v > 0);
    var flag = k.getAttribute('data-kpi-flag'), field = k.getAttribute('data-kpi-field');
    if (!flag || !field) return;
    each('.bcard', null, function (c) {
      var n = days(c.getAttribute('data-' + field));
      c.setAttribute('data-' + flag, n !== null && holds(k.getAttribute('data-kpi-rule'), n) ? '1' : '0');
    });
  });

  /* 3 · the date framings: each card into the column its distance picks */
  function fold(col, items, cap, empty) {
    var head = col.querySelector('header'), h3 = head && head.querySelector('h3');
    var stack = col.querySelector('.bstack');
    if (!head || !stack) return;
    var n = h3 && h3.querySelector('.n');
    if (n) n.textContent = String(items.length);
    var ripe = items.filter(function (c) { return c.getAttribute('data-ripe') === '1'; }).length;
    if (ripe && col.getAttribute('data-col') !== 'ripe' && h3) {
      var rp = document.createElement('span');
      rp.className = 'rp';
      rp.textContent = '◆ ' + ripe + ' ripe';
      h3.insertAdjacentElement('afterend', rp);
    }
    var mix = [], at = {};
    items.forEach(function (c) {
      var t = c.getAttribute('data-track') || '';
      if (!(t in at)) {
        var tk = c.querySelector('.bc-tk');
        at[t] = mix.length;
        mix.push({ n: 0, label: (tk ? tk.textContent : t).toLowerCase() });
      }
      mix[at[t]].n++;
    });
    if (mix.length > 1) {
      var p = document.createElement('p');
      p.className = 'mix';
      p.textContent = mix.slice().sort(function (a, b) { return b.n - a.n; })   // stable: ties keep first-seen order
        .map(function (m) { return m.n + ' ' + m.label; }).join(' · ');
      head.appendChild(p);
    }
    items.slice(0, cap).forEach(function (c) { stack.appendChild(c); });
    var tail = items.slice(cap);
    if (tail.length) {
      var bf = document.createElement('div');
      bf.className = 'bfold';
      tail.forEach(function (c) { bf.appendChild(c); });
      var more = document.createElement('button');
      more.className = 'bmore';
      more.setAttribute('data-n', String(tail.length));
      more.textContent = '+ ' + tail.length + ' more';
      stack.appendChild(bf);
      stack.appendChild(more);
    }
    if (!items.length) {
      var e = document.createElement('div');
      e.className = 'bempty';
      e.textContent = empty;
      stack.appendChild(e);
    }
  }
  each('.bboard[data-days]', null, function (b) {
    var pool = b.querySelector('.bpool');
    if (!pool) return;
    var field = b.getAttribute('data-days'), spec = b.getAttribute('data-buckets');
    var und = b.getAttribute('data-undated') || 'undated', cap = +b.getAttribute('data-cap') || 8;
    var by = {};
    [].slice.call(pool.children).forEach(function (c) {       // the pool is in reading order: kept per column
      var n = days(c.getAttribute('data-' + field));
      var k = n === null ? und : pick(spec, n);
      (by[k] = by[k] || []).push(c);
    });
    pool.parentNode.removeChild(pool);
    each('.bcol', b, function (col) {
      fold(col, by[col.getAttribute('data-col')] || [], cap, b.getAttribute('data-empty') || '');
    });
  });
})();
