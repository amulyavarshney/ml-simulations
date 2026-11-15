/* Validation curve: training score and 5-fold CV score against one complexity knob (RBF gamma), with the decision boundary at the chosen value. */
(function () {
  'use strict';
  const { stage, side } = UI.shell('evaluation/validation-curve');
  const h = UI.h, NG = 21, E0 = -2, E1 = 2.5, STEP = (E1 - E0) / (NG - 1), ge = (j) => E0 + j * STEP;
  let n = 150, noise = 0.3, C = 10, seed = 3, jSel = 11, data = null, curve = [], job = null, gen = 0, bd = null, zones = null;

  const c = UI.panel(side, 'The knob');
  const gs = UI.slider(c, { label: 'γ (RBF width): small = smooth, large = wiggly', min: Math.pow(10, E0), max: Math.pow(10, E1), log: true, step: STEP, value: Math.pow(10, ge(jSel)), fmt: (v) => UI.sci(v), onInput(v) { jSel = Math.max(0, Math.min(NG - 1, Math.round((Math.log10(v) - E0) / STEP))); pick(); } });
  const d = UI.panel(side, 'Data and model');
  UI.slider(d, { label: 'Noise in the moons', min: 0.05, max: 0.6, step: 0.05, value: noise, fmt: (v) => v.toFixed(2), onInput: UI.debounce((v) => { noise = v; run(); }, 250) });
  UI.slider(d, { label: 'Number of points, n', min: 60, max: 300, step: 10, value: n, fmt: (v) => String(Math.round(v)), onInput: UI.debounce((v) => { n = Math.round(v); run(); }, 250) });
  UI.slider(d, { label: 'Penalty C', min: 0.1, max: 1000, log: true, value: C, fmt: (v) => UI.sci(v), onInput: UI.debounce((v) => { C = v; run(); }, 250) });
  UI.buttons(d, [{ label: 'New data', primary: true, onClick() { seed++; run(); } }]);
  const pg = UI.progress(d);
  const rd = UI.panel(side, 'At the chosen value'), R = UI.read(rd, [{ id: 'g', label: 'γ' }, { id: 'tr', label: 'Training score' }, { id: 'cv', label: '5-fold CV score' }, { id: 'gap', label: 'Gap (training − CV)' }, { id: 'best', label: 'Best γ on the curve' }]);
  const dx = h('p', { class: 'note callout', role: 'status' }); rd.append(dx);

  const V = UI.plotCard(stage, 'Score against γ', { xlim: [E0 - 0.1, E1 + 0.1], ylim: [0.5, 1.02], aspect: 1.9, margin: { l: 54, r: 14, t: 12, b: 44 }, interactive: true, label: 'Training score and cross-validated score against gamma, with underfitting and overfitting zones' }, 'Click or drag along the curve to move γ. Bands show ±1 standard deviation over the five folds. The shaded zones come from the CV curve: the middle zone is every γ whose CV score is within one standard error of the best.');
  UI.legend(V.card, [{ label: 'training score', color: UI.colors().c[1], shape: 'dash' }, { label: '5-fold CV score', color: UI.colors().c[0], shape: 'line' }, { label: 'best γ', color: UI.colors().c[2], shape: 'diamond' }]);
  const B = UI.plotCard(stage, 'The boundary at this γ', { xlim: [-1.7, 2.7], ylim: [-1.2, 1.7], aspect: 1.9, equal: true, margin: { l: 34, r: 10, t: 10, b: 30 }, label: 'Decision boundary of the SVM at the chosen gamma with the training points' }, ' ');
  UI.legend(B.card, [{ label: 'class A', color: UI.colors().c[0], shape: 'circle' }, { label: 'class B', color: UI.colors().c[1], shape: 'triangle' }, { label: 'boundary', color: UI.colors().ink, shape: 'line' }]);

  function* steps(my) {
    const r = ML.rng(seed * 313 + 5), dd = ML.data.moons(n, noise, r), X = dd.X, y = dd.y.map((v) => (v ? 1 : -1)); data = { X, y }; const sp = ML.stratKFold(y, 5, ML.rng(seed + 9)); curve = [];
    for (let j = 0; j < NG; j++) {
      const tr = [], te = []; for (const s of sp) { const m = ML.svc(s.train.map((q) => X[q]), s.train.map((q) => y[q]), { kernel: 'rbf', gamma: Math.pow(10, ge(j)), C, maxMs: 300 }); tr.push(ML.mean(s.train.map((q) => (m.predict(X[q]) === y[q] ? 1 : 0)))); te.push(ML.mean(s.test.map((q) => (m.predict(X[q]) === y[q] ? 1 : 0)))); }
      curve.push({ g: Math.pow(10, ge(j)), tr: ML.mean(tr), te: ML.mean(te), sd: ML.std(te) }); yield (j + 1) / NG;
    }
  }
  function run() { if (job) job.stop(); curve = []; zones = null; job = EVU.job(steps(++gen), { progress: pg, frame: () => { analyse(); pick(); }, done: () => { analyse(); pick(); } }); refit(); V.plot.redraw(); }
  function analyse() {
    if (curve.length < NG) { zones = null; return; } let bi = 0; curve.forEach((q, i) => { if (q.te > curve[bi].te + 1e-12) bi = i; }); const se = curve[bi].sd / Math.sqrt(5), near = curve.map((q) => q.te >= curve[bi].te - se - 1e-12);
    let a = bi, b = bi; while (a > 0 && near[a - 1]) a--; while (b < NG - 1 && near[b + 1]) b++; zones = { bi, a, b, se };
  }
  function refit() { if (!data) { bd = null; return; } const g = Math.pow(10, ge(jSel)); bd = ML.svc(data.X, data.y, { kernel: 'rbf', gamma: g, C, maxMs: 200 }); }
  function pick() {
    refit(); const q = curve[jSel];
    R.set('g', UI.sci(Math.pow(10, ge(jSel)))); if (q) { R.set('tr', EVU.pc(q.tr, 1)); R.set('cv', EVU.pc(q.te, 1) + ' ± ' + (100 * q.sd).toFixed(1)); R.set('gap', ((q.tr - q.te) * 100).toFixed(1) + ' points', q.tr - q.te > 0.07 ? 'bad' : 'good'); } else { ['tr', 'cv', 'gap'].forEach((k) => R.set(k, '…')); }
    if (zones) { R.set('best', UI.sci(curve[zones.bi].g) + ' (' + EVU.pc(curve[zones.bi].te, 1) + ')', 'good'); const z = jSel < zones.a ? 'under' : jSel > zones.b ? 'over' : 'mid', gap = (q.tr - q.te) * 100;
      dx.innerHTML = z === 'under' ? '<b>Underfits (high bias).</b> Training and validation scores are close (gap ' + gap.toFixed(1) + ' points) but both sit below what a more flexible \u03b3 reaches (best CV ' + EVU.pc(curve[zones.bi].te, 1) + '): the boundary is too smooth to follow the moons.' : z === 'over' ? '<b>Overfits (high variance).</b> Training stays high but validation falls (gap ' + gap.toFixed(1) + ' points): the boundary bends round individual noisy points.' : '<b>About right.</b> The CV score is within one standard error of the best, and the gap is ' + gap.toFixed(1) + ' points.'; }
    else { R.set('best', '…'); dx.textContent = 'Computing the curve…'; }
    V.plot.redraw(); B.plot.redraw();
  }
  V.plot.draw = (p) => {
    const col = p.col, lo = curve.length ? Math.max(0.3, Math.floor((Math.min(...curve.map((q) => q.te)) - 0.06) * 20) / 20) : 0.5; p.setLims(null, [lo, 1.02]); p._layout();
    p.axes({ xlabel: 'γ (log scale)', ylabel: 'accuracy', xticks: [-2, -1, 0, 1, 2], xfmt: (v) => String(+Math.pow(10, v).toPrecision(2)), yfmt: (v) => Math.round(v * 100) + '%' });
    if (zones) {
      p.rect(E0 - 0.1, lo, ge(zones.a) - STEP / 2, 1.02, { fill: col.c[3], alpha: 0.13 }); p.rect(ge(zones.b) + STEP / 2, lo, E1 + 0.1, 1.02, { fill: col.c[7], alpha: 0.12 });
      p.text((E0 - 0.1 + ge(zones.a) - STEP / 2) / 2, 1.0, 'underfits', { align: 'center', weight: 700, color: col.ink, size: 12, base: 'top', dy: 8 }); p.text((ge(zones.b) + STEP / 2 + E1 + 0.1) / 2, 1.0, 'overfits', { align: 'center', weight: 700, color: col.ink, size: 12, base: 'top', dy: 8 });
      p.text((ge(zones.a) + ge(zones.b)) / 2, lo + 0.015, 'about right', { align: 'center', weight: 700, color: col.ink2, size: 11.5, base: 'bottom', dy: -2 });
    }
    if (!curve.length) return; const pts = (k) => curve.map((q, i) => [ge(i), q[k]]);
    p.poly(curve.map((q, i) => [ge(i), Math.min(1.02, q.te + q.sd)]).concat(curve.map((q, i) => [ge(i), q.te - q.sd]).reverse()), { fill: col.c[0], alpha: 0.16 });
    p.line(pts('tr'), { color: col.c[1], w: 2.6, dash: [8, 5] }); p.line(pts('te'), { color: col.c[0], w: 3.2 });
    curve.forEach((q, i) => { p.dot(ge(i), q.te, { fill: col.c[0], r: 3.4, lw: 1 }); });
    if (zones) p.dot(ge(zones.bi), curve[zones.bi].te, { fill: col.c[2], shape: 'diamond', r: 7.5, lw: 1.6, stroke: col.ink });
    p.seg(ge(jSel), lo, ge(jSel), 1.02, { color: col.accent, w: 1.6, dash: [3, 3] }); if (curve[jSel]) { p.dot(ge(jSel), curve[jSel].te, { fill: col.c[0], r: 6.5, lw: 2, stroke: col.ink }); p.dot(ge(jSel), curve[jSel].tr, { fill: col.c[1], r: 6, shape: 'square', lw: 2, stroke: col.ink }); }
    p.setLabel('Training and cross-validated score against gamma' + (zones ? '; the best gamma is ' + UI.sci(curve[zones.bi].g) + ' with CV score ' + EVU.pc(curve[zones.bi].te, 0) : ''));
  };
  const fromX = (e) => Math.max(0, Math.min(NG - 1, Math.round((e.x - E0) / STEP)));
  V.plot.on('down', (e) => { jSel = fromX(e); gs.set(Math.pow(10, ge(jSel))); pick(); return true; }).on('move', (e) => { jSel = fromX(e); gs.set(Math.pow(10, ge(jSel))); pick(); });
  V.canvas = V.plot.canvas; V.plot.canvas.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { jSel = Math.max(0, Math.min(NG - 1, jSel + (e.key === 'ArrowRight' ? 1 : -1))); gs.set(Math.pow(10, ge(jSel))); pick(); e.preventDefault(); } });
  B.plot.draw = (p) => {
    const col = p.col; p.axes({ zero: false, xfmt: (v) => +v.toFixed(1) + '', yfmt: (v) => +v.toFixed(1) + '' }); if (!data || !bd) return;
    const c0 = UI.rgb(col.c[0]), c1 = UI.rgb(col.c[1]), f = p.field((x, y) => bd.decision([x, y]), 70, 40);
    p.heat(f, (v) => { const a = Math.round(255 * Math.min(0.24, 0.05 + 0.09 * Math.min(Math.abs(v), 1.6))), cc = v >= 0 ? c1 : c0; return [cc[0], cc[1], cc[2], a]; }); p.contour(f, 0, { color: col.ink, w: 2.6 });
    data.X.forEach((q, i) => { const st = UI.cls(data.y[i] > 0 ? 1 : 0); p.dot(q[0], q[1], { fill: st.color, shape: st.shape, r: 4.2, lw: 1.4 }); });
    B.cap.innerHTML = 'The boundary of the SVM at γ = ' + UI.sci(Math.pow(10, ge(jSel))) + ' fitted to all ' + n + ' points. Look for the point where it stops following the moons and starts chasing single points.'; p.setLabel('Decision boundary at gamma ' + UI.sci(Math.pow(10, ge(jSel))));
  };
  run();
})();
