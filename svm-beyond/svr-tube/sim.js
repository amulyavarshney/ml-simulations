/* Support vector regression: the epsilon tube, support vectors, number of SVs against epsilon, loss shape. */
(function () {
  'use strict';
  const { stage, side } = UI.shell('svm-beyond/svr-tube');
  const h = UI.h;
  const PRE = {
    sine: { label: 'Noisy sine curve', make: (r) => Array.from({ length: 45 }, () => { const x = -3 + 6 * r(); return { x, y: Math.sin(1.3 * x) + 0.22 * r.normal(), c: 0 }; }) },
    line: { label: 'Line with one outlier', make: (r) => Array.from({ length: 30 }, () => { const x = -3 + 6 * r(); return { x, y: 0.5 * x + 0.15 * r.normal(), c: 0 }; }).concat([{ x: 1.5, y: -2, c: 0 }]) },
    quad: { label: 'Noisy parabola', make: (r) => Array.from({ length: 40 }, () => { const x = -2.6 + 5.2 * r(); return { x, y: 0.4 * x * x - 1.2 + 0.2 * r.normal(), c: 0 }; }) },
  };
  let preset = 'sine', seed = 4, pts = PRE[preset].make(ML.rng(seed)), kernel = 'rbf', eps = 0.2, C = 10, gamma = 1, model = null, curve = null;

  const c = UI.panel(side, 'Data');
  const mode = UI.seg(c, { label: 'Click on the plot to…', options: [{ value: 'A', label: 'add a point' }, { value: 'X', label: 'remove' }], value: 'A', help: 'Dragging any point always moves it.' });
  UI.select(c, { label: 'Start from', options: Object.keys(PRE).map((k) => ({ value: k, label: PRE[k].label })), value: preset, onChange(v) { preset = v; pts = PRE[v].make(ML.rng(seed)); update(true); } });
  UI.buttons(c, [{ label: 'Add an outlier', onClick() { pts.push({ x: 0.6, y: 1.9, c: 0 }); update(true); } }, { label: 'New sample', onClick() { seed++; pts = PRE[preset].make(ML.rng(seed)); update(true); } }]);
  const k = UI.panel(side, 'SVR settings');
  UI.seg(k, { label: 'Kernel', options: [{ value: 'rbf', label: 'RBF' }, { value: 'linear', label: 'Linear' }, { value: 'poly', label: 'Poly (3)' }], value: kernel, onChange(v) { kernel = v; update(true); } });
  UI.slider(k, { label: 'ε (tube half-width)', min: 0, max: 1, step: 0.01, value: eps, fmt: (v) => v.toFixed(2), onInput(v) { eps = v; update(false); } });
  UI.slider(k, { label: 'C', min: 0.01, max: 1000, log: true, value: C, fmt: (v) => UI.sci(v), onInput(v) { C = v; update(true); } });
  UI.slider(k, { label: 'γ (RBF width)', min: 0.01, max: 100, log: true, value: gamma, fmt: (v) => UI.sci(v), onInput(v) { gamma = v; update(true); } });
  const rd = UI.panel(side, 'Readouts'), R = UI.read(rd, [{ id: 'sv', label: 'Support vectors' }, { id: 'in', label: 'Points inside the tube (zero loss)' }, { id: 'loss', label: 'Σ ε-insensitive loss' }, { id: 'mse', label: 'Mean squared error' }]);

  const ed = SU.editor(stage, { title: 'Regression with an ε-tube', xlim: [-3.2, 3.2], ylim: [-2.6, 2.6], aspect: 1.7, equal: false, points: () => pts, mode: () => mode.get(), onChange(done) { update(done); }, draw, cap: 'Solid curve: the fit. Shaded band: the tube f(x) ± ε. Ringed points are support vectors (on or outside the tube); thin segments show how far a point sits outside.' });
  const row = h('div', { class: 'row' }); stage.append(row);
  const N = UI.plotCard(row, 'Support vectors against ε', { xlim: [0, 1], ylim: [0, 1], aspect: 1.6, margin: { l: 52, b: 42 }, hover: true, label: 'Number of support vectors against epsilon' }, 'Same data, C and kernel, only ε changes.');
  const L = UI.plotCard(row, 'Loss against residual', { xlim: [-2, 2], ylim: [0, 2], aspect: 1.6, margin: { l: 48, b: 42 }, label: 'Epsilon-insensitive loss and squared error against residual' }, ' ');
  UI.legend(L.card, [{ label: 'ε-insensitive loss', color: UI.colors().c[0], shape: 'line' }, { label: 'squared error ½r²', color: UI.colors().muted, shape: 'dash' }]);

  const opts = (e) => ({ kernel, epsilon: e, C, gamma, degree: 3, coef0: 1, maxMs: 300 });
  const XY = () => ({ X: pts.map((q) => [q.x]), y: pts.map((q) => q.y) });
  /* the dashed curve ½r² is below the ε-loss only for moderate misses; it overtakes it for large ones */
  function lossCap() {
    const lo = 1 - Math.sqrt(Math.max(0, 1 - 2 * eps)), hi = 1 + Math.sqrt(Math.max(0, 1 - 2 * eps));
    L.cap.innerHTML = 'Zero inside the tube, linear outside. ' + (eps < 0.5 ? 'At ε = ' + eps.toFixed(2) + ' the squared error ½r² (dashed) is <b>below</b> the ε-loss for misses between ' + lo.toFixed(2) + ' and ' + hi.toFixed(2) + ' and above it beyond that, so the linear loss helps only against large misses.' : 'At ε = ' + eps.toFixed(2) + ' the squared error ½r² (dashed) is never below the ε-loss.');
  }
  function update(full) {
    lossCap();
    if (pts.length < 4) { model = null; ed.plot.redraw(); return; } const d = XY(); model = ML.svr(d.X, d.y, opts(eps));
    let inside = 0, loss = 0, mse = 0; pts.forEach((q) => { const r = q.y - model.predict([q.x]), a = Math.abs(r); if (a <= eps + 1e-6) inside++; loss += Math.max(0, a - eps); mse += r * r; });
    R.set('sv', model.nSV + ' of ' + pts.length); R.set('in', inside + ' of ' + pts.length + ' (' + UI.pct(inside / pts.length, 0) + ')'); R.set('loss', UI.f(loss, 2)); R.set('mse', UI.f(mse / pts.length, 3));
    curve = []; for (let x = -3.2; x <= 3.2001; x += 0.04) curve.push([x, model.predict([x])]);
    if (full || !update.nCurve) { update.nCurve = []; for (let e = 0; e <= 1.0001; e += 0.05) { const m2 = ML.svr(d.X, d.y, opts(e)); update.nCurve.push([e, m2.nSV]); } }
    ed.plot.redraw(); N.plot.redraw(); L.plot.redraw();
  }
  function draw(p) {
    const col = p.col; if (!model) { pts.forEach((q) => p.dot(q.x, q.y, { fill: col.c[0] })); return; }
    p.poly(curve.map((q) => [q[0], q[1] + eps]).concat(curve.slice().reverse().map((q) => [q[0], q[1] - eps])), { fill: col.c[0], alpha: 0.16 });
    p.line(curve.map((q) => [q[0], q[1] + eps]), { color: col.c[0], w: 1.2, dash: [5, 4] }); p.line(curve.map((q) => [q[0], q[1] - eps]), { color: col.c[0], w: 1.2, dash: [5, 4] });
    p.line(curve, { color: col.ink, w: 3 });
    const svs = new Set(model.svIdx);
    pts.forEach((q) => { const f = model.predict([q.x]), r = q.y - f; if (Math.abs(r) > eps + 1e-6) p.seg(q.x, q.y, q.x, f + Math.sign(r) * eps, { color: col.c[1], w: 1.4, alpha: 0.9 }); });
    pts.forEach((q, i) => p.dot(q.x, q.y, { fill: svs.has(i) ? col.c[1] : col.c[0], shape: svs.has(i) ? 'triangle' : 'circle', r: 4.8, lw: 1.4 }));
    model.svIdx.forEach((i) => p.ring(pts[i].x, pts[i].y, 9.5, { color: col.ink, w: 1.4 }));
    p.setLabel('Support vector regression with tube half-width ' + eps.toFixed(2) + ' and ' + model.nSV + ' support vectors');
  }
  N.plot.draw = (p) => { const col = p.col, nc = update.nCurve || [], top = Math.max(10, pts.length); p.setLims(null, [0, top * 1.05]); p._layout(); p.axes({ xlabel: 'ε', ylabel: 'support vectors', xticks: [0, 0.25, 0.5, 0.75, 1] }); if (!nc.length) return; p.line(nc, { color: col.c[0], w: 3 }); nc.forEach((q) => p.dot(q[0], q[1], { fill: col.c[0], r: 3.4 })); p.seg(eps, 0, eps, top * 1.05, { color: col.accent, w: 1.4, dash: [3, 3] }); if (model) p.dot(eps, model.nSV, { fill: col.ink, r: 6 }); };
  N.plot.on('hover', (e) => { const nc = update.nCurve || []; if (!nc.length) return; const q = nc.reduce((a, b) => (Math.abs(b[0] - e.x) < Math.abs(a[0] - e.x) ? b : a)); UI.tip.show('ε = ' + q[0].toFixed(2) + '<br>' + q[1] + ' support vectors', e.cx, e.cy); });
  L.plot.draw = (p) => { const col = p.col; p.axes({ xlabel: 'residual  y − f(x)', ylabel: 'loss', zero: true }); const a = [], b = []; for (let r = -2; r <= 2.001; r += 0.02) { a.push([r, Math.max(0, Math.abs(r) - eps)]); b.push([r, 0.5 * r * r]); } p.line(b, { color: col.muted, w: 2, dash: [6, 5] }); p.line(a, { color: col.c[0], w: 3 }); p.rect(-eps, 0, eps, 2, { fill: col.c[0], alpha: 0.1 }); p.text(0, 1.85, 'tube: zero loss', { align: 'center', color: col.ink2, size: 12, weight: 600 }); };
  update(true);
})();
