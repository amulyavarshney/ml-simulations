/* embed-ui.js: helpers shared by the t-SNE / UMAP pages (needs ui.js, ml-core.js, ml-embed.js). */
(function () {
  'use strict';
  const EU = (window.EU = {}), h = UI.h;

  /** balanced subset of the digits: nPerClass images from each listed class */
  EU.digitsSubset = function (nPerClass, seed, classes) {
    const dig = ML.data.digits(), r = ML.rng(seed || 0), by = {}; classes = classes || [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    dig.y.forEach((c, i) => { (by[c] = by[c] || []).push(i); });
    const idx = []; classes.forEach((c) => { const l = by[c].slice(); r.shuffle(l); idx.push(...l.slice(0, nPerClass)); });
    return { X: idx.map((i) => dig.X[i]), y: idx.map((i) => dig.y[i]), idx };
  };
  /** continuous colour from the sequential ramp, t in [0, 1] */
  EU.ramp = function (t) {
    const s = UI.colors().seq.slice(1).map(UI.rgb), x = Math.min(0.9999, Math.max(0, t)) * (s.length - 1), i = Math.floor(x), c = UI.mix(s[i], s[i + 1], x - i);
    return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
  };
  /** a plot card for a 2-D map: no axes (their numbers mean nothing), equal scale, hover optional */
  EU.mapCard = function (parent, title, cap, o) {
    o = o || {}; const pc = UI.plotCard(parent, title, { xlim: [-1, 1], ylim: [-1, 1], aspect: o.aspect || 1.12, equal: true, margin: { l: 6, r: 6, t: 6, b: 6 }, hover: true, interactive: !!o.interactive, label: o.label || title }, cap);
    return pc;
  };
  /** fit limits to the points with a little padding */
  EU.fit = function (p, E, pad) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; E.forEach((q) => { if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1]; });
    if (!isFinite(x0)) return; const px = (x1 - x0) * (pad || 0.06) + 1e-9, py = (y1 - y0) * (pad || 0.06) + 1e-9; p.xlim = [x0 - px, x1 + px]; p.ylim = [y0 - py, y1 + py]; p._layout();
  };
  /** frame around a map */
  EU.frame = function (p) { const c = p.ctx; c.save(); c.strokeStyle = p.col.grid; c.lineWidth = 1; c.strokeRect(p.m.l + .5, p.m.t + .5, p.pw - 1, p.ph - 1); c.restore(); };
  /** draw a 2-D map. o: labels (class per point), values (0..1 per point for a gradient), kind 'digit' | 'dots' | 'grad', r, alpha, dim (Set of indices to fade), glyphs (array of strings overriding digits) */
  EU.drawMap = function (p, E, o) {
    o = o || {}; const col = p.col, c = p.ctx; EU.fit(p, E, o.pad); EU.frame(p);
    if (!E.length) return;
    const font = '700 ' + (o.size || 11) + 'px ' + getComputedStyle(document.body).fontFamily;
    c.save(); c.beginPath(); c.rect(p.m.l, p.m.t, p.pw, p.ph); c.clip();
    if (o.kind === 'digit') { c.font = font; c.textAlign = 'center'; c.textBaseline = 'middle'; }
    E.forEach((q, i) => {
      const x = p.X(q[0]), y = p.Y(q[1]), faded = o.dim && o.dim.has(i); c.globalAlpha = faded ? 0.18 : (o.alpha == null ? 0.95 : o.alpha);
      if (o.kind === 'grad') { c.fillStyle = EU.ramp(o.values[i]); c.beginPath(); c.arc(x, y, o.r || 3.4, 0, 6.2832); c.fill(); }
      else if (o.kind === 'digit') { c.fillStyle = col.c[o.labels[i] % 8]; c.fillText(o.glyphs ? o.glyphs[i] : String(o.labels[i]), x, y); }
      else { const st = UI.cls(o.labels ? o.labels[i] : 0); c.fillStyle = st.color; c.strokeStyle = col.surface; c.lineWidth = 1; UI.markerPath(c, st.shape, x, y, o.r || 3.6); if (st.shape === 'cross') { c.strokeStyle = st.color; c.lineWidth = 2; c.stroke(); } else { c.fill(); c.stroke(); } }
    });
    c.restore();
  };
  /** legend for ten digit classes */
  EU.digitLegend = function (parent) { const box = h('div', { class: 'legend' }); for (let k = 0; k < 10; k++) box.append(h('span', null, h('b', { style: { color: 'var(--c' + ((k % 8) + 1) + ')', fontFamily: 'var(--mono)' }, text: String(k) }))); box.prepend(h('span', { text: 'digit class:' })); parent.append(box); return box; };

  /** run a steppable algorithm (t-SNE or UMAP) with progress. o.speed 'watch' advances a fixed share per frame so the optimisation can be seen;
   *  'instant' uses a time budget. o.onFrame(alg, progress, more), o.onDone(alg). Returns the animation controller (stop(), running). */
  EU.speed = 'watch';
  EU.runner = function (alg, o) {
    const total = alg.maxIter, count = () => (alg.iter != null ? alg.iter : alg.epoch), per = Math.max(1, Math.ceil(total / 150));
    const anim = UI.animate((ms) => {
      if ((o.speed || EU.speed) === 'watch' && !UI.reduced) { for (let i = 0; i < per && count() < total; i++) alg.step(); return count() < total; }
      return alg.run(ms * 2.5);
    }, (more) => { if (o.onFrame) o.onFrame(alg, count() / total, more); }, { budget: o.budget || 12, done() { if (o.onDone) o.onDone(alg); } });
    anim.alg = alg; anim.start(); return anim;
  };
  /** the shared "speed" control */
  EU.speedControl = function (parent, onChange) {
    return UI.seg(parent, { label: 'Animation', options: [{ value: 'watch', label: 'Watch it settle' }, { value: 'instant', label: 'Instant' }], value: EU.speed, onChange(v) { EU.speed = v; if (onChange) onChange(v); } });
  };
  /** Pearson correlation */
  EU.corr = function (a, b) { const n = a.length, ma = ML.mean(a), mb = ML.mean(b); let s = 0, sa = 0, sb = 0; for (let i = 0; i < n; i++) { s += (a[i] - ma) * (b[i] - mb); sa += (a[i] - ma) ** 2; sb += (b[i] - mb) ** 2; } return s / Math.sqrt(sa * sb); };
  /** distances between class centroids (upper triangle) in a map or in the original space */
  EU.centroidDists = function (E, labels) {
    const cl = Array.from(new Set(labels)).sort((a, b) => a - b), cen = cl.map((k) => { const m = new Float64Array(E[0].length); let c = 0; E.forEach((q, i) => { if (labels[i] === k) { for (let j = 0; j < q.length; j++) m[j] += q[j]; c++; } }); return Array.from(m, (v) => v / c); }), out = [];
    for (let i = 0; i < cl.length; i++) for (let j = i + 1; j < cl.length; j++) out.push(Math.sqrt(ML.sqdist(cen[i], cen[j])));
    return out;
  };
  /** mean distance of points to their class centroid */
  EU.spreads = function (E, labels) { const cl = Array.from(new Set(labels)).sort((a, b) => a - b); return cl.map((k) => { const pts = E.filter((_, i) => labels[i] === k), m = ML.colMeans(pts); return ML.mean(pts.map((q) => Math.sqrt(ML.sqdist(q, m)))); }); };
})();
