/* Scaling and SVMs: the informative feature in changing units, raw SVM against a standardised one. */
(function () {
  'use strict';
  const { stage, side } = UI.shell('svm-margin/scaling');
  const h = UI.h;
  let mult = 0.03, seed = 4, base = null, data = null, curve = null;
  const N = 60;
  function gen() { const r = ML.rng(seed * 101), X = [], y = []; for (let i = 0; i < N; i++) { const c = i % 2, s = c ? 1 : -1; X.push([s * 0.9 + 0.9 * r.normal(), s * 0.3 + 1.0 * r.normal()]); y.push(s); } base = { X, y }; }
  gen();

  const c = UI.panel(side, 'Units of feature 1');
  const mS = UI.slider(c, { label: 'Multiply feature 1 by', min: 0.01, max: 100, log: true, value: mult, fmt: (v) => '× ' + (v >= 1 ? +v.toPrecision(3) : +v.toPrecision(2)), help: 'Feature 1 is the informative one. Smaller numbers = a bigger unit (metres instead of millimetres).', onInput(v) { mult = v; update(); } });
  UI.buttons(c, [{ label: 'New data', onClick() { seed++; gen(); curve = null; update(); } }]);
  UI.note(c, 'Feature 1 separates the classes well (about 84% accuracy on its own, in theory). Feature 2 is only weakly informative (about 62% on its own). Both SVMs use C = 1.');
  const rd = UI.panel(side, 'Readouts'), R = UI.read(rd, [{ id: 'raw', label: 'Raw SVM, cross-validated accuracy' }, { id: 'std', label: 'Standardised SVM, cross-validated accuracy' }, { id: 'inf1', label: 'Raw: share of the score from feature 1' }, { id: 'inf2', label: 'Standardised: share from feature 1' }]);

  const row = h('div', { class: 'row' }); stage.append(row);
  const A = UI.plotCard(row, 'Raw units: what the unscaled SVM sees', { xlim: [-1, 1], ylim: [-3, 3], aspect: 1.15, margin: { l: 50, r: 10, t: 10, b: 40 }, label: 'Scatter in raw units with the raw SVM line' }, 'The raw SVM\'s line. Make feature 1 smaller (multiplier below about 0.07) and watch the line flatten as the SVM stops using feature 1.');
  const B = UI.plotCard(row, 'After standardising', { xlim: [-3, 3], ylim: [-3, 3], aspect: 1.15, margin: { l: 44, r: 10, t: 10, b: 40 }, label: 'Scatter after standardising with the standardised SVM line' }, 'The same points in standard units. The line looks the same whatever the multiplier.');
  SU.legend(stage, 'class A', 'class B');
  const Cv = UI.plotCard(stage, 'Cross-validated accuracy against the units of feature 1', { xlim: [-2, 2], ylim: [0.4, 1], aspect: 2.4, margin: { l: 52, b: 42 }, hover: true, label: 'Accuracy of raw and standardised SVM against the multiplier' }, 'The standardised SVM does not care about units. The raw SVM suffers when feature 1 is in small numbers (left) but copes when it is in large numbers (right), because the useful feature then dominates.');
  UI.legend(Cv.card, [{ label: 'standardised', color: UI.colors().c[0], shape: 'line' }, { label: 'raw units', color: UI.colors().c[1], shape: 'dash' }]);

  const raw = (m) => base.X.map((q) => [q[0] * m, q[1]]);
  const opts = { kernel: 'linear', C: 1, maxMs: 250 };
  function cvAcc(m, std) {
    const X = raw(m), y = base.y; let ok = 0;
    for (let f = 0; f < 5; f++) { const te = [], tr = []; X.forEach((_, i) => (i % 5 === f ? te : tr).push(i)); let A2 = tr.map((i) => X[i]), B2 = te.map((i) => X[i]); if (std) { const s = ML.scaler(A2, true); A2 = s.transform(A2); B2 = s.transform(B2); } const mod = ML.svc(A2, tr.map((i) => y[i]), opts); B2.forEach((q, k) => { if (mod.predict(q) === y[te[k]]) ok++; }); }
    return ok / X.length;
  }
  const share = (mod, X) => { const sd = ML.colStd(X); const a = Math.abs(mod.w[0]) * sd[0], b = Math.abs(mod.w[1]) * sd[1]; return a / (a + b); };
  function update() {
    const X = raw(mult), y = base.y, sc = ML.scaler(X, true), Z = sc.transform(X);
    data = { X, Z, rawM: ML.svc(X, y, opts), stdM: ML.svc(Z, y, opts) };
    R.set('raw', UI.pct(cvAcc(mult, false), 0)); R.set('std', UI.pct(cvAcc(mult, true), 0)); R.set('inf1', UI.pct(share(data.rawM, X), 0)); R.set('inf2', UI.pct(share(data.stdM, Z), 0));
    if (!curve) { curve = []; for (let e = -2; e <= 2.001; e += 0.25) curve.push({ e, raw: cvAcc(Math.pow(10, e), false), std: cvAcc(Math.pow(10, e), true) }); }
    A.plot.redraw(); B.plot.redraw(); Cv.plot.redraw();
  }
  function scatter(p, X, model, lims) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; X.forEach((q) => { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); });
    const px = (x1 - x0) * 0.08, py = (y1 - y0) * 0.08; p.xlim = [x0 - px, x1 + px]; p.ylim = [y0 - py, y1 + py]; p._layout();
    p.axes({ xlabel: 'feature 1', ylabel: 'feature 2', xfmt: (v) => UI.sci(v), yfmt: (v) => UI.sci(v) });
    const pts = X.map((q, i) => ({ x: q[0], y: q[1], c: base.y[i] > 0 ? 1 : 0 })); model.pts = pts; SU.drawModel(p, model, { linear: true, margins: false, sv: false }); SU.drawPoints(p, pts, { r: 4.4 });
  }
  A.plot.draw = (p) => { if (data) scatter(p, data.X, data.rawM); };
  B.plot.draw = (p) => { if (data) scatter(p, data.Z, data.stdM); };
  Cv.plot.draw = (p) => {
    const col = p.col; p.axes({ xlabel: 'multiplier on feature 1 (log scale)', ylabel: 'accuracy', xticks: [-2, -1, 0, 1, 2], xfmt: (v) => UI.sci(Math.pow(10, v)), yfmt: (v) => Math.round(v * 100) + '%' }); if (!curve) return;
    p.line(curve.map((q) => [q.e, q.std]), { color: col.c[0], w: 3 }); p.line(curve.map((q) => [q.e, q.raw]), { color: col.c[1], w: 3, dash: [7, 5] });
    p.seg(Math.log10(mult), 0.4, Math.log10(mult), 1, { color: col.accent, w: 1.4, dash: [3, 3] });
  };
  Cv.plot.on('hover', (e) => { if (!curve) return; const q = curve.reduce((a, b) => (Math.abs(b.e - e.x) < Math.abs(a.e - e.x) ? b : a)); UI.tip.show('× ' + UI.sci(Math.pow(10, q.e)) + '<br>raw ' + UI.pct(q.raw, 0) + '<br>standardised ' + UI.pct(q.std, 0), e.cx, e.cy); });
  update();
})();
