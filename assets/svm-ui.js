/* svm-ui.js: shared pieces for the SVM pages: editable 2-D point plots, data presets, decision-surface drawing, cross-validation.
 * Needs ui.js, ml-core.js and ml-svm.js. Points are {x, y, c} with class c in {0, 1}; class 0 is blue circles, class 1 is orange triangles. */
(function () {
  'use strict';
  const SU = (window.SU = {}), h = UI.h;

  /* ---------- presets ---------- */
  SU.PRESETS = {
    blobs: { label: 'Two separated groups', make: (r) => blobs(r, 14, [-1.1, -0.5], [1.1, 0.5], 0.5) },
    overlap: { label: 'Overlapping groups', make: (r) => blobs(r, 24, [-0.6, -0.3], [0.6, 0.3], 0.85) },
    outlier: { label: 'Separated groups + one odd point', make: (r) => blobs(r, 13, [-1.2, -0.4], [1.2, 0.4], 0.45).concat([{ x: -0.35, y: 0.1, c: 1 }]) },
    xor: { label: 'XOR (four corners)', make: (r) => { const d = ML.data.xor(48, 0.18, r); return d.X.map((q, i) => ({ x: q[0] * 1.5, y: q[1] * 1.2, c: d.y[i] })); } },
    circles: { label: 'Rings', make: (r) => { const d = ML.data.circles(70, 0.1, 0.45, r); return d.X.map((q, i) => ({ x: q[0] * 1.9, y: q[1] * 1.5, c: d.y[i] })); } },
    moons: { label: 'Two moons', make: (r) => { const d = ML.data.moons(80, 0.18, r); return d.X.map((q, i) => ({ x: (q[0] - 0.5) * 1.9, y: (q[1] - 0.25) * 2.2, c: d.y[i] })); } },
    spiral: { label: 'Spirals', make: (r) => { const d = ML.data.spiral(100, 0.06, r); return d.X.map((q, i) => ({ x: q[0] * 1.5, y: q[1] * 1.3, c: d.y[i] })); } },
  };
  function blobs(r, m, ca, cb, s) { const out = []; for (let i = 0; i < m; i++) { out.push({ x: ca[0] + s * r.normal(), y: ca[1] + s * r.normal(), c: 0 }); out.push({ x: cb[0] + s * r.normal(), y: cb[1] + s * r.normal(), c: 1 }); } return out; }
  SU.makePts = (name, seed) => SU.PRESETS[name].make(ML.rng(seed || 1));
  SU.options = (names) => names.map((k) => ({ value: k, label: SU.PRESETS[k].label }));
  SU.XY = (pts) => ({ X: pts.map((p) => [p.x, p.y]), y: pts.map((p) => (p.c ? 1 : -1)) });
  SU.hasBoth = (pts) => pts.some((p) => p.c === 0) && pts.some((p) => p.c === 1);

  /* ---------- fitting helpers ---------- */
  SU.fit = function (pts, opts) { if (!SU.hasBoth(pts)) return null; const d = SU.XY(pts); const m = ML.svc(d.X, d.y, opts); m.pts = pts; return m; };
  /** stratified shuffled k-fold accuracy of an SVC with the given options */
  SU.cv = function (pts, opts, k, seed) {
    if (!SU.hasBoth(pts) || pts.length < 2 * k) return null; const r = ML.rng(seed || 7), idx0 = [], idx1 = [];
    pts.forEach((p, i) => (p.c ? idx1 : idx0).push(i)); r.shuffle(idx0); r.shuffle(idx1); const fold = new Array(pts.length);
    idx0.forEach((i, j) => { fold[i] = j % k; }); idx1.forEach((i, j) => { fold[i] = j % k; });
    let ok = 0, tot = 0;
    for (let f = 0; f < k; f++) { const tr = [], te = []; pts.forEach((p, i) => (fold[i] === f ? te : tr).push(p)); if (!SU.hasBoth(tr) || !te.length) continue; const m = SU.fit(tr, opts); te.forEach((p) => { if (m.predict([p.x, p.y]) === (p.c ? 1 : -1)) ok++; tot++; }); }
    return tot ? ok / tot : null;
  };
  SU.accuracy = (m, pts) => pts.filter((p) => m.predict([p.x, p.y]) === (p.c ? 1 : -1)).length / pts.length;
  /** slack of each training point for a fitted classifier: max(0, 1 - y f(x)) */
  SU.slack = (m, pts) => pts.map((p) => Math.max(0, 1 - (p.c ? 1 : -1) * m.decision([p.x, p.y])));

  /* ---------- drawing ---------- */
  SU.pointStyle = (c) => UI.cls(c);
  SU.drawPoints = function (p, pts, o) {
    o = o || {};
    pts.forEach((q, i) => { const st = SU.pointStyle(q.c); p.dot(q.x, q.y, { fill: st.color, shape: st.shape, r: o.r || 5.4, alpha: o.dim && o.dim(i) ? 0.35 : 1, lw: 1.6 }); });
  };
  /** colour the plane by predicted class and draw the boundary and margins. o: nx, ny, linear (draw exact lines), margins (bool), regions (bool), sv (bool) */
  SU.drawModel = function (p, m, o) {
    o = o || {}; const col = p.col, c0 = UI.rgb(col.c[0]), c1 = UI.rgb(col.c[1]);
    if (!m) return;
    if (o.regions !== false) {
      const f = p.field((x, y) => m.decision([x, y]), o.nx || 64, o.ny || 46);
      p.heat(f, (v) => { const a = Math.round(255 * Math.min(0.24, 0.05 + 0.09 * Math.min(Math.abs(v), 1.6))), c = v >= 0 ? c1 : c0; return [c[0], c[1], c[2], a]; });
      if (!o.linear) { if (o.margins !== false) { p.contour(f, 1, { color: col.c[1], w: 1.4, dash: [5, 4], alpha: 0.9 }); p.contour(f, -1, { color: col.c[0], w: 1.4, dash: [5, 4], alpha: 0.9 }); } p.contour(f, 0, { color: col.ink, w: 2.6 }); }
    }
    if (o.linear && m.w) {
      const w = m.w, b = m.b; if (o.margins !== false) { p.abline(w[0], w[1], b - 1, { color: col.c[1], w: 1.5, dash: [6, 5] }); p.abline(w[0], w[1], b + 1, { color: col.c[0], w: 1.5, dash: [6, 5] }); }
      p.abline(w[0], w[1], b, { color: col.ink, w: 2.8 });
    }
    if (o.sv !== false && m.svIdx) m.svIdx.forEach((i) => { const q = m.pts[i]; p.ring(q.x, q.y, 10, { color: col.ink, w: 1.8 }); });
  };

  /* ---------- the editable plot ---------- */
  /** o: title, xlim, ylim, aspect, cap, points: () => array (live reference), mode: () => 'A' | 'B' | 'X', onChange(), draw(p, ctx), maxPoints, tip(i) -> html */
  SU.editor = function (parent, o) {
    const pc = UI.plotCard(parent, o.title, { xlim: o.xlim || [-3, 3], ylim: o.ylim || [-2.2, 2.2], aspect: o.aspect || 1.45, interactive: true, equal: o.equal !== false, margin: o.margin || { l: 38, r: 10, t: 10, b: 32 }, label: o.label || o.title }, o.cap);
    const p = pc.plot; let drag = -1;
    p.draw = (pl, c) => { pl.axes({ zero: true, xfmt: (v) => +v.toFixed(2) + '', yfmt: (v) => +v.toFixed(2) + '' }); o.draw(pl, c); };
    const hit = (e) => { let best = -1, bd = 14; o.points().forEach((q, i) => { const d = Math.hypot(p.X(q.x) - e.px, p.Y(q.y) - e.py); if (d < bd) { bd = d; best = i; } }); return best; };
    p.on('down', (e) => {
      const pts = o.points(), i = hit(e), mode = o.mode ? o.mode() : 'A';
      if (mode === 'P') { o.onProbe(e.x, e.y); drag = -2; return true; }
      if (mode === 'X') { if (i >= 0) { pts.splice(i, 1); o.onChange(true); } return false; }
      if (i >= 0) { drag = i; return true; }
      if (e.x < p.vx[0] || e.x > p.vx[1] || e.y < p.vy[0] || e.y > p.vy[1] || pts.length >= (o.maxPoints || 200)) return false;
      pts.push({ x: e.x, y: e.y, c: mode === 'B' ? 1 : 0 }); drag = pts.length - 1; o.onChange(true); return true;
    }).on('move', (e) => { if (drag === -2) { o.onProbe(e.x, e.y); return; } if (drag < 0) return; const q = o.points()[drag]; if (!q) return; q.x = UI.clamp(e.x, p.vx[0], p.vx[1]); q.y = UI.clamp(e.y, p.vy[0], p.vy[1]); o.onChange(false); })
      .on('up', () => { if (drag >= 0) { drag = -1; o.onChange(true); } else drag = -1; })
      .on('hover', (e) => { const i = hit(e); p.canvas.style.cursor = i >= 0 ? (o.mode && o.mode() === 'X' ? 'not-allowed' : 'grab') : 'crosshair'; if (i >= 0 && o.tip) UI.tip.show(o.tip(i), e.cx, e.cy); else UI.tip.hide(); });
    return pc;
  };
  /** the "click action" control */
  SU.modeControl = function (parent, aName, bName, probe) {
    const opts = [{ value: 'A', label: 'add ' + (aName || 'blue') }, { value: 'B', label: 'add ' + (bName || 'orange') }, { value: 'X', label: 'remove' }]; if (probe) opts.push({ value: 'P', label: 'probe' });
    return UI.seg(parent, { label: 'Click on the plot to…', options: opts, value: 'A', help: 'Dragging any point always moves it.' });
  };
  SU.legend = function (parent, a, b) { return UI.legend(parent, [{ label: a || 'class A', color: UI.colors().c[0], shape: 'circle' }, { label: b || 'class B', color: UI.colors().c[1], shape: 'triangle' }]); };
})();
