/* eval-ui.js: shared pieces for the Session 5 pages (needs ui.js, ml-core.js, ml-svm.js, ml-eval.js):
 * a time-sliced job runner with a progress bar, histograms, dot strips, a colour ramp, small tables. */
(function () {
  'use strict';
  const EVU = (window.EVU = {}), h = UI.h;

  /** Run a generator in short slices so the page stays responsive. The generator yields the fraction done (0..1) after each unit of work.
   *  o: progress (UI.progress), frame(more, frac) to repaint, done() when finished. Returns {stop()}. */
  EVU.job = function (gen, o) {
    o = o || {}; let frac = 0;
    const anim = UI.animate((ms) => {
      const t0 = performance.now();
      do { const r = gen.next(); if (r.done) { frac = 1; return false; } frac = r.value; } while (performance.now() - t0 < ms);
      return true;
    }, (more) => { if (o.progress) o.progress.set(more ? frac : 1); if (o.frame) o.frame(more, frac); }, { budget: o.budget || 12, done: o.done });
    anim.start(); return anim;
  };

  EVU.pc = (v, d) => (v == null || !isFinite(v) ? '–' : (100 * v).toFixed(d == null ? 0 : d) + '%');
  /** a sequential colour ramp from the site tokens, t in [0, 1] -> 'rgb(...)' */
  EVU.ramp = function (t) {
    const s = UI.colors().seq.slice(0, 5).map(UI.rgb), x = UI.clamp(t, 0, 0.9999) * (s.length - 1), i = Math.floor(x), c = UI.mix(s[i], s[i + 1], x - i);
    return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
  };
  /** counts of `vals` in bins of width `w` starting at `lo` */
  EVU.bin = function (vals, lo, hi, w) {
    const nb = Math.round((hi - lo) / w), c = new Array(nb).fill(0);
    vals.forEach((v) => { const b = Math.min(nb - 1, Math.max(0, Math.floor((v - lo) / w + 1e-9))); c[b]++; });
    return c;
  };
  /** histogram bars on a Plot (x in data units). o: lo, hi, w, color, alpha */
  EVU.hist = function (p, vals, o) {
    const c = EVU.bin(vals, o.lo, o.hi, o.w), col = p.col;
    c.forEach((k, i) => { if (k) p.rect(o.lo + i * o.w + o.w * 0.06, 0, o.lo + (i + 1) * o.w - o.w * 0.06, k, { fill: o.color || col.c[0], alpha: o.alpha == null ? 0.85 : o.alpha, stroke: col.surface, w: 1 }); });
    return c;
  };
  /** jittered dots for one group at x; deterministic jitter so the picture is stable */
  EVU.strip = function (p, x, vals, o) {
    o = o || {}; const col = p.col, r = ML.rng(o.seed || 3);
    vals.forEach((v) => p.dot(x + (r() - 0.5) * (o.width || 0.5), v, { fill: o.color || col.c[0], shape: o.shape || 'circle', r: o.r || 4, alpha: o.alpha == null ? 0.8 : o.alpha, lw: 1 }));
  };
  /** a small results table: head = [..], rows = [[..], ..] (cells are text or {text, cls, html}) */
  EVU.table = function (parent, head, rows, o) {
    o = o || {}; const tb = h('tbody');
    rows.forEach((r) => tb.append(h('tr', null, r.map((c) => (c && typeof c === 'object' ? h('td', { class: c.cls, text: c.html ? null : c.text, html: c.html }) : h('td', { text: c }))))));
    const t = h('table', { class: 't' + (o.cls ? ' ' + o.cls : '') }, o.caption ? h('caption', { class: 'sr-only', text: o.caption }) : null, h('thead', null, h('tr', null, head.map((t2) => h('th', { text: t2, scope: 'col' })))), tb);
    parent.append(h('div', { class: 'tablewrap' }, t)); return { el: t, set(rows2) { tb.textContent = ''; rows2.forEach((r) => tb.append(h('tr', null, r.map((c) => (c && typeof c === 'object' ? h('td', { class: c.cls, text: c.html ? null : c.text, html: c.html }) : h('td', { text: c })))))); } };
  };
  /** a plain titled card for tables and text */
  EVU.card = function (parent, title) { const c = h('section', { class: 'card panel' }, title ? h('h3', { text: title }) : null); parent.append(c); return c; };
  /** short seed helper: seeds for the n-th draw of a page */
  EVU.seed = (base, k) => (base * 7919 + k * 104729) >>> 0;
})();
