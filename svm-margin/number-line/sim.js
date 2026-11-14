/* The widest street on a number line: threshold, margin, support points, and the margin-against-threshold tent. */
(function () {
  'use strict';
  const { stage, side } = UI.shell('svm-margin/number-line');
  const h = UI.h;
  const base = () => [-2.1, -1.7, -1.4, -1.0, -0.7, -0.4].map((x) => ({ x, c: 0 })).concat([0.5, 0.9, 1.2, 1.6, 2.0, 2.3].map((x) => ({ x, c: 1 })));
  let pts = base(), t = 0.6, C = 1000, odd = false, model = null;

  const c = UI.panel(side, 'Threshold');
  const tS = UI.slider(c, { label: 'Your threshold', min: -3, max: 3, step: 0.01, value: t, fmt: (v) => v.toFixed(2), onInput(v) { t = v; update(); } });
  UI.buttons(c, [{ label: 'Snap to maximum margin', primary: true, onClick() { const m = best(); if (m) { t = m.t; tS.set(t); update(); } } }]);
  const d = UI.panel(side, 'Readings');
  UI.buttons(d, [{ label: 'Add an odd reading', onClick() { if (!odd) { pts.push({ x: -1.2, c: 1 }); odd = true; update(); } } }, { label: 'Reset readings', onClick() { pts = base(); odd = false; update(); } }]);
  UI.note(d, 'Drag a reading sideways. Drag the vertical line to move the threshold. Orange (right) = failing, blue (left) = healthy.');
  const cs = UI.slider(d, { label: 'SVM penalty C', min: 0.01, max: 1000, log: true, value: C, fmt: (v) => UI.sci(v), help: 'Large C is the hard margin; small C tolerates mistakes.', onInput(v) { C = v; update(); } });
  const rd = UI.panel(side, 'Readouts'), R = UI.read(rd, [{ id: 'm', label: 'Margin at your threshold' }, { id: 'best', label: 'Largest possible margin' }, { id: 'svm', label: 'SVM threshold' }, { id: 'half', label: 'SVM street half-width 1/|w|' }, { id: 'sv', label: 'Support points' }]);

  const A = UI.plotCard(stage, 'Sensor readings on a line', { xlim: [-3.2, 3.2], ylim: [-1, 1], aspect: 3.3, margin: { l: 14, r: 14, t: 10, b: 34 }, interactive: true, label: 'Number line with healthy and failing readings and a movable threshold' }, 'The shaded street reaches the nearest reading on each side. Ringed readings are the support vectors.');
  SU.legend(A.card, 'healthy', 'failing');
  const B = UI.plotCard(stage, 'Margin against threshold position', { xlim: [-3.2, 3.2], ylim: [0, 1], aspect: 2.9, margin: { l: 48, r: 14, t: 10, b: 40 }, hover: true, label: 'Margin as a function of threshold position' }, 'Zero where the threshold does not separate the two groups; a tent peaking at the maximum-margin threshold.');

  /* geometry: classes may be dragged so that left/right flips; use orientation of class means */
  function sep(th) { const l = pts.filter((p) => p.c === 0), r = pts.filter((p) => p.c === 1); if (!l.length || !r.length) return null; const ml = ML.mean(l.map((p) => p.x)), mr = ML.mean(r.map((p) => p.x)), s = mr >= ml ? 1 : -1; const ok = pts.every((p) => (p.c === 1 ? s * (p.x - th) > 0 : s * (p.x - th) < 0)); if (!ok) return { ok: false, s }; return { ok: true, s, m: Math.min(...pts.map((p) => Math.abs(p.x - th))) }; }
  function best() { const l = pts.filter((p) => p.c === 0).map((p) => p.x), r = pts.filter((p) => p.c === 1).map((p) => p.x); if (!l.length || !r.length) return null; const s = ML.mean(r) >= ML.mean(l) ? 1 : -1, lo = s > 0 ? Math.max(...l) : Math.min(...l), hi = s > 0 ? Math.min(...r) : Math.max(...r); if (s * (hi - lo) <= 0) return null; return { t: (lo + hi) / 2, m: Math.abs(hi - lo) / 2 }; }
  function fit() { model = null; if (pts.length < 2 || !pts.some((p) => p.c) || !pts.some((p) => !p.c)) return; model = ML.svc(pts.map((p) => [p.x]), pts.map((p) => (p.c ? 1 : -1)), { kernel: 'linear', C, maxMs: 300 }); }
  function update() {
    fit(); const s = sep(t), b = best(); R.set('m', s && s.ok ? UI.f(s.m, 3) : 'threshold does not separate', s && s.ok ? 'good' : 'warn'); R.set('best', b ? UI.f(b.m, 3) + ' at ' + UI.f(b.t, 3) : 'none: the groups overlap', b ? '' : 'warn');
    if (model && Math.abs(model.w[0]) > 1e-9) { R.set('svm', UI.f(-model.b / model.w[0], 3)); R.set('half', UI.f(1 / Math.abs(model.w[0]), 3)); R.set('sv', String(model.nSV)); } else { R.set('svm', '–'); R.set('half', '–'); R.set('sv', '–'); }
    A.plot.redraw(); B.plot.redraw();
  }
  A.plot.draw = (p, cx) => {
    const col = p.col, y0 = p.Y(0), s = sep(t); p.axes({ grid: false, yticks: [], xticks: [-3, -2, -1, 0, 1, 2, 3], xlabel: 'sensor reading' });
    if (s && s.ok) p.rect(t - s.m, -0.55, t + s.m, 0.55, { fill: col.c[3], alpha: 0.2 });
    if (model && Math.abs(model.w[0]) > 1e-9) { const ts = -model.b / model.w[0], hw = 1 / Math.abs(model.w[0]); p.seg(ts, -0.7, ts, 0.7, { color: col.accent, w: 2, dash: [6, 5] }); p.text(ts, 0.8, 'SVM', { color: col.accent, align: 'center', weight: 700, halo: true, size: 12 }); p.seg(ts - hw, -0.3, ts - hw, 0.3, { color: col.accent, w: 1.2, dash: [2, 3] }); p.seg(ts + hw, -0.3, ts + hw, 0.3, { color: col.accent, w: 1.2, dash: [2, 3] }); }
    p.seg(t, -0.75, t, 0.75, { color: col.ink, w: 3 }); p.text(t, -0.86, 'your threshold', { color: col.ink, align: 'center', weight: 700, halo: true, size: 12 });
    p.seg(-3.2, 0, 3.2, 0, { color: col.axis, w: 1.2 });
    pts.forEach((q, i) => { const st = UI.cls(q.c); p.dot(q.x, 0, { fill: st.color, shape: st.shape, r: 7, lw: 1.8 }); });
    if (model) model.svIdx.forEach((i) => p.ring(pts[i].x, 0, 12, { color: col.ink, w: 1.8 }));
    p.setLabel('Readings on a number line; your threshold is at ' + t.toFixed(2) + (s && s.ok ? ' with margin ' + s.m.toFixed(2) : ' and does not separate the classes'));
  };
  B.plot.draw = (p) => {
    const col = p.col, b = best(); p.setLims(null, [0, Math.max(0.2, (b ? b.m : 0.5) * 1.35)]); p._layout(); p.axes({ xlabel: 'threshold position', ylabel: 'margin' });
    const cur = []; for (let x = -3.2; x <= 3.2; x += 0.02) { const s = sep(x); cur.push([x, s && s.ok ? s.m : 0]); }
    p.line(cur, { color: col.c[0], w: 3 }); if (b) { p.dot(b.t, b.m, { fill: col.c[2], shape: 'diamond', r: 7 }); p.text(b.t, b.m, 'maximum ' + UI.f(b.m, 2), { color: col.ink, weight: 700, dy: -14, align: 'center', halo: true }); }
    const s = sep(t); p.dot(t, s && s.ok ? s.m : 0, { fill: col.ink, r: 6 });
  };
  B.plot.on('hover', (e) => { const s = sep(e.x); UI.tip.show('threshold ' + UI.f(e.x, 2) + '<br>' + (s && s.ok ? 'margin ' + UI.f(s.m, 3) : 'does not separate'), e.cx, e.cy); });
  let drag = null;
  A.plot.on('down', (e) => { if (Math.abs(A.plot.X(t) - e.px) < 12) { drag = 'th'; return true; } let best2 = -1, bd = 16; pts.forEach((q, i) => { const dd = Math.hypot(A.plot.X(q.x) - e.px, A.plot.Y(0) - e.py); if (dd < bd) { bd = dd; best2 = i; } }); if (best2 >= 0) { drag = best2; return true; } return false; })
    .on('move', (e) => { const x = UI.clamp(e.x, -3.1, 3.1); if (drag === 'th') { t = x; tS.set(t); } else if (drag !== null) pts[drag].x = x; update(); }).on('up', () => { drag = null; })
    .on('hover', (e) => { const near = Math.abs(A.plot.X(t) - e.px) < 12 || pts.some((q) => Math.hypot(A.plot.X(q.x) - e.px, A.plot.Y(0) - e.py) < 16); A.plot.canvas.style.cursor = near ? 'ew-resize' : 'default'; });
  update();
})();
