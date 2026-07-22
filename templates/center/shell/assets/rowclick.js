/* PROPOSED shell addition — UNIFIED row expand. One click on a row opens (or
   closes) EVERYTHING that row can open, together:
     · standard .tbl rows  → all ⊕ cells in the row (+ its detail row);
     · xtable .xrow rows    → the row's own content (galleries / columns / cases)
                              AND the ⊕ text expanders in its summary, as one.
   The ⊕ button and the row behave identically. Links navigate; proof artifacts
   open the viewer; a click inside already-open content does not collapse the
   row; selecting text does not toggle. */
(function () {
  function setAll(dets, open) {
    for (var i = 0; i < dets.length; i++) dets[i].open = open;
  }
  document.addEventListener('click', function (e) {
    if (e.target.closest('a')) return;                         // links navigate
    if (e.target.closest('[data-lb]')) return;                 // artifact → viewer
    if (window.getSelection && String(window.getSelection())) return;  // text select

    // --- xtable row: the summary toggles the row content + its ⊕ cells -------
    var xrow = e.target.closest('.xrow');
    if (xrow) {
      var box = xrow.querySelector(':scope > summary')
             || xrow.querySelector(':scope > .xsummary');
      if (!box || !box.contains(e.target)) return;   // clicks in the body: ignore
      e.preventDefault();                            // stop native single-toggles
      var pmores = Array.prototype.slice.call(box.querySelectorAll('details'));
      if (xrow.tagName === 'DETAILS') {              // expandable row
        var open = !xrow.open;
        xrow.open = open;                            // fires toggle → cascades legs
        setAll(pmores, open);
      } else if (pmores.length) {                    // flat row, ⊕ text only
        var openF = pmores.some(function (d) { return !d.open; });
        setAll(pmores, openF);
        xrow.classList.toggle('rowopen', openF);
      }
      return;
    }

    // --- standard .tbl row: toggle all its expanders together ----------------
    var tr = e.target.closest('.tbl tbody > tr');
    if (!tr || tr.classList.contains('exp')) return;
    var dets = Array.prototype.slice.call(tr.querySelectorAll('details'));
    var next = tr.nextElementSibling;
    if (next && next.classList.contains('exp'))
      dets = dets.concat(Array.prototype.slice.call(next.querySelectorAll('details')));
    if (!dets.length) return;
    if (e.target.closest('summary')) e.preventDefault();   // stop native single-toggle
    var o = dets.some(function (d) { return !d.open; });
    setAll(dets, o);
    tr.classList.toggle('rowopen', o);
    if (next && next.classList.contains('exp')) next.classList.toggle('rowopen', o);
  });

  /* Cross-reference targets. The data model, matrix and proof shelf are now
     xtable rows whose id sits on a CLOSED <details class="xrow">. A link like
     "returns TransactionDetail" (href="#dm-…") scrolls the row into view but,
     without this, lands on a row that is still folded — the reader clicks to
     SEE the type and sees a summary. Open the targeted row (and any ancestor
     xrow) so the thing they navigated to is actually revealed. The :target tab
     CSS already unfolds the enclosing tab. */
  function openTarget() {
    var h = location.hash ? location.hash.slice(1) : '';
    if (!h) return;
    var el = document.getElementById(h);
    while (el) {
      if (el.tagName === 'DETAILS' && el.classList.contains('xrow')) el.open = true;
      el = el.parentElement && el.parentElement.closest
        ? el.parentElement.closest('details.xrow') : null;
    }
    var t = document.getElementById(h);
    if (t && t.scrollIntoView) t.scrollIntoView({ block: 'center' });
  }
  window.addEventListener('hashchange', openTarget);
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', openTarget);
  else openTarget();
})();
