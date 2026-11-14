/* Soft margin: C sets the price of violations. Boundary, slack, objective split, and curves against C. */
(function () {
  'use strict';
  const { stage, side } = UI.shell('svm-margin/soft-margin');
  const h = UI.h;
  let preset = 'overlap', seed = 5, pts = SU.makePts(preset, seed), C = 1, model = null, curves = null;

  const c = UI.panel(side, 'Penalty');
  const cS = UI.slider(c, { label: 'C', min: 0.01, max: 1000, log: true, value: C, fmt: (v) => UI.sci(v), onInput(v) { C = v; update(false); } });
  const d = UI.panel(side, 'Data');
  const mode = SU.modeControl(d, 'blue', 'orange');
  UI.select(d, { label: 'Start from', options: SU.options(['overlap', 'outlier', 'blobs']), value: preset, onChange(v) { preset = v; pts = SU.makePts(v, seed); update(true); } });
  UI.buttons(d, [{ label: 'Add an outlier', onClick() { pts.push({ x: 0.9, y: 0.7, c: 0 }); update(true); } }, { label: 'New sample', onClick() { seed++; pts = SU.makePts(preset, seed); update(true); } }]);
  const rd = UI.panel(side, 'Readouts'), R = UI.read(rd, [{ id: 'width', label: 'Street width 2/‖w‖' }, { id: 'sv', label: 'Support vectors' }, { id: 'err', label: 'Training errors' }, { id: 'tr', label: 'Training accuracy' }, { id: 'cv', label: '5-fold cross-validated accuracy' }, { id: 'p1', label: '½‖w‖²  (wide street)' }, { id: 'p2', label: 'C · Σξ  (violations)' }]);

  const ed = SU.editor(stage, { title: 'Overlapping classes', xlim: [-3.2, 3.2], ylim: [-2.3, 2.3], aspect: 1.55, points: () => pts, mode: () => mode.get(), onChange(done) { update(done); }, draw, cap: 'Dashed lines: the street\'s edges. Points inside the street or on the wrong side pay a penalty ξ (drawn as a short segment to the street).' });
  SU.legend(ed.card, 'class A', 'class B');
  const row = h('div', { class: 'row' }); stage.append(row);
  const A = UI.plotCard(row, 'Accuracy against C', { xlim: [-2, 3], ylim: [0.4, 1.02], aspect: 1.6, margin: { l: 52, b: 42 }, hover: true, label: 'Training and cross-validated accuracy against C' });
  UI.legend(A.card, [{ label: 'training accuracy', color: UI.colors().c[1], shape: 'dash' }, { label: 'cross-validated accuracy', color: UI.colors().c[0], shape: 'line' }]);
  const B = UI.plotCard(row, 'Street width against C', { xlim: [-2, 3], ylim: [0, 4], aspect: 1.6, margin: { l: 52, b: 42 }, hover: true, label: 'Street width against C' });

  const opts = () => ({ kernel: 'linear', C, maxMs: 300 });
  function update(full) {
    model = SU.fit(pts, opts()); if (!model) { ed.plot.redraw(); return; }
    const nw = Math.hypot(...model.w), sl = SU.slack(model, pts), viol = sl.reduce((s, v) => s + v, 0), err = pts.filter((q) => model.predict([q.x, q.y]) !== (q.c ? 1 : -1)).length;
    R.set('width', UI.f(2 / nw, 3)); R.set('sv', model.nSV + ' of ' + pts.length); R.set('err', String(err)); R.set('tr', UI.pct(1 - err / pts.length, 0)); R.set('p1', UI.f(0.5 * nw * nw, 2)); R.set('p2', UI.f(C * viol, 2));
    if (full) computeCurves(); R.set('cv', curves ? UI.pct(SU.cv(pts, opts(), 5, 7), 1) : '–');
    ed.plot.redraw(); A.plot.redraw(); B.plot.redraw();
  }
  function computeCurves() { curves = []; if (!SU.hasBoth(pts) || pts.length < 12) { curves = null; return; } for (let e = -2; e <= 3.001; e += 0.25) { const o = { kernel: 'linear', C: Math.pow(10, e), maxMs: 150 }, m = SU.fit(pts, o); curves.push({ e, tr: SU.accuracy(m, pts), cv: SU.cv(pts, o, 5, 7), w: 2 / Math.hypot(...m.w) }); } }
  function draw(p) {
    const col = p.col; if (!model) { SU.drawPoints(p, pts); return; }
    SU.drawModel(p, model, { linear: true, sv: true });
    const sl = SU.slack(model, pts); pts.forEach((q, i) => { if (sl[i] > 1e-3) { const f = model.decision([q.x, q.y]), y = q.c ? 1 : -1, nw = Math.hypot(...model.w), dist = (y - f) / nw; const ux = model.w[0] / nw * y, uy = model.w[1] / nw * y; p.seg(q.x, q.y, q.x + ux * dist, q.y + uy * dist, { color: col.ink, w: 1.4, alpha: 0.8 }); } });
    SU.drawPoints(p, pts); p.setLabel('Two overlapping classes with a soft-margin line at C = ' + UI.sci(C));
  }
  A.plot.draw = (p) => { const col = p.col; p.axes({ xlabel: 'C (log scale)', ylabel: 'accuracy', xticks: [-2, -1, 0, 1, 2, 3], xfmt: (v) => UI.sci(Math.pow(10, v)), yfmt: (v) => Math.round(v * 100) + '%' }); if (!curves) return; p.line(curves.map((q) => [q.e, q.tr]), { color: col.c[1], w: 2.2, dash: [6, 5] }); p.line(curves.map((q) => [q.e, q.cv]), { color: col.c[0], w: 3 }); p.seg(Math.log10(C), 0.4, Math.log10(C), 1.02, { color: col.accent, w: 1.4, dash: [3, 3] }); let bi = 0; curves.forEach((q, i) => { if (q.cv > curves[bi].cv + 1e-9) bi = i; }); p.dot(curves[bi].e, curves[bi].cv, { fill: col.c[2], shape: 'diamond', r: 6.5 }); p.text(curves[bi].e, curves[bi].cv, 'best CV at C ≈ ' + UI.sci(Math.pow(10, curves[bi].e)), { color: col.ink, weight: 700, dy: -14, align: 'center', halo: true, size: 12 }); };
  A.plot.on('hover', (e) => { if (!curves) return; const q = curves.reduce((a, b) => (Math.abs(b.e - e.x) < Math.abs(a.e - e.x) ? b : a)); UI.tip.show('C = ' + UI.sci(Math.pow(10, q.e)) + '<br>training ' + UI.pct(q.tr, 0) + '<br>cross-validated ' + UI.pct(q.cv, 0), e.cx, e.cy); });
  B.plot.draw = (p) => { const col = p.col; const mx = curves ? Math.max(1, ...curves.map((q) => q.w)) * 1.1 : 4; p.setLims(null, [0, mx]); p._layout(); p.axes({ xlabel: 'C (log scale)', ylabel: 'street width', xticks: [-2, -1, 0, 1, 2, 3], xfmt: (v) => UI.sci(Math.pow(10, v)) }); if (!curves) return; p.line(curves.map((q) => [q.e, q.w]), { color: col.c[0], w: 3 }); p.seg(Math.log10(C), 0, Math.log10(C), mx, { color: col.accent, w: 1.4, dash: [3, 3] }); };
  B.plot.on('hover', (e) => { if (!curves) return; const q = curves.reduce((a, b) => (Math.abs(b.e - e.x) < Math.abs(a.e - e.x) ? b : a)); UI.tip.show('C = ' + UI.sci(Math.pow(10, q.e)) + '<br>street width ' + UI.f(q.w, 2), e.cx, e.cy); });
  update(true);
})();
