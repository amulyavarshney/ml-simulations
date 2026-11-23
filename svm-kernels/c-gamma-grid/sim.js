/* Tune C and gamma together: held-out accuracy over a log grid, click a cell to see its boundary. */
(function () {
  'use strict';
  const { stage, side } = UI.shell('svm-kernels/c-gamma-grid');
  const h = UI.h;
  const EXPS = [-2, -1, 0, 1, 2, 3];
  let noise = 0.25, seed = 12, metric = 'test', data = null, grid = [], sel = [2, 2], gScale = 1, tab = 'moons';

  const c = UI.panel(side, 'Data');
  UI.seg(c, { label: 'Shape', options: [{ value: 'moons', label: 'Moons' }, { value: 'circles', label: 'Rings' }], value: tab, onChange(v) { tab = v; build(); } });
  UI.slider(c, { label: 'Noise', min: 0.05, max: 0.5, step: 0.01, value: noise, fmt: (v) => v.toFixed(2), onInput: UI.debounce((v) => { noise = v; build(); }, 200) });
  UI.buttons(c, [{ label: 'New data', onClick() { seed++; build(); } }]);
  UI.note(c, '150 training points and 150 held-out points. Each cell is one SVM.');
  const m = UI.panel(side, 'Grid shows');
  UI.seg(m, { options: [{ value: 'test', label: 'Test accuracy' }, { value: 'train', label: 'Training accuracy' }, { value: 'sv', label: 'SV share' }], value: metric, onChange(v) { metric = v; G.plot.redraw(); } });
  const rd = UI.panel(side, 'Selected cell'), R = UI.read(rd, [{ id: 'cg', label: 'C, γ' }, { id: 'tr', label: 'Training accuracy' }, { id: 'te', label: 'Test accuracy' }, { id: 'sv', label: 'Support vectors' }, { id: 'best', label: 'Best cell on the grid (picked by test score)' }, { id: 'gs', label: 'γ = “scale” for this data' }]);
  UI.note(rd, 'The best cell is picked by the same test scores that are shown here, so its test accuracy is a little optimistic. In your own work choose (C, γ) by cross-validation on the training data and use the test set once, at the end.');

  const G = UI.plotCard(stage, 'C × γ grid', { xlim: [-2.5, 3.5], ylim: [-2.5, 3.5], aspect: 1.35, margin: { l: 66, r: 12, t: 12, b: 50 }, interactive: true, equal: false, label: 'Grid of accuracies for combinations of C and gamma' }, 'Click a cell. The dashed column is scikit-learn\'s γ = “scale”. Brighter = higher accuracy; the cell numbers are the accuracy in percent.');
  const B = UI.plotCard(stage, 'Decision boundary of the selected cell', { xlim: [-1.9, 2.9], ylim: [-1.4, 1.9], aspect: 1.7, margin: { l: 36, r: 10, t: 10, b: 32 }, label: 'Decision boundary of the selected cell with training points' }, '');
  SU.legend(B.card, 'class A', 'class B');

  const ramp = (t) => { const s = UI.colors().seq.map(UI.rgb), x = UI.clamp(t, 0, 0.9999) * (s.length - 1), i = Math.floor(x), c2 = UI.mix(s[i], s[i + 1], x - i); return 'rgb(' + c2.join(',') + ')'; };
  function build() {
    const mk = (s) => (tab === 'moons' ? ML.data.moons(150, noise, ML.rng(s)) : ML.data.circles(150, noise * 0.55, 0.45, ML.rng(s)));
    const a = mk(seed), b = mk(seed + 77); data = { Xtr: a.X, ytr: a.y.map((v) => (v ? 1 : -1)), Xte: b.X, yte: b.y.map((v) => (v ? 1 : -1)) }; gScale = ML.gammaScale(data.Xtr);
    grid = EXPS.map((ce) => EXPS.map((ge) => { const mod = ML.svc(data.Xtr, data.ytr, { kernel: 'rbf', gamma: Math.pow(10, ge), C: Math.pow(10, ce), maxMs: 400 }); const acc = (X, y) => X.filter((x, i) => mod.predict(x) === y[i]).length / X.length; return { tr: acc(data.Xtr, data.ytr), te: acc(data.Xte, data.yte), sv: mod.nSV / data.Xtr.length, nsv: mod.nSV }; }));
    let best = [0, 0]; grid.forEach((row, i) => row.forEach((q, j) => { if (q.te > grid[best[0]][best[1]].te + 1e-9) best = [i, j]; })); sel = best; select(best);
  }
  function select(s) {
    sel = s; const q = grid[s[0]][s[1]], C = Math.pow(10, EXPS[s[0]]), g = Math.pow(10, EXPS[s[1]]); let best = [0, 0]; grid.forEach((row, i) => row.forEach((qq, j) => { if (qq.te > grid[best[0]][best[1]].te + 1e-9) best = [i, j]; }));
    R.set('cg', 'C = ' + UI.sci(C) + ', γ = ' + UI.sci(g)); R.set('tr', UI.pct(q.tr, 0)); R.set('te', UI.pct(q.te, 0), q.te >= grid[best[0]][best[1]].te - 1e-9 ? 'good' : ''); R.set('sv', q.nsv + ' of 150'); R.set('best', 'C = ' + UI.sci(Math.pow(10, EXPS[best[0]])) + ', γ = ' + UI.sci(Math.pow(10, EXPS[best[1]])) + ' → ' + UI.pct(grid[best[0]][best[1]].te, 0)); R.set('gs', UI.f(gScale, 2));
    fitSel = ML.svc(data.Xtr, data.ytr, { kernel: 'rbf', gamma: g, C, maxMs: 400 }); G.plot.redraw(); B.plot.redraw();
  }
  let fitSel = null;
  G.plot.draw = (p) => {
    const col = p.col, cx = (j) => EXPS[j], val = (q) => (metric === 'test' ? q.te : metric === 'train' ? q.tr : q.sv), lo = metric === 'sv' ? 0 : 0.5, hi = 1;
    p.axes({ grid: false, xticks: EXPS, yticks: EXPS, xlabel: 'γ (log scale)', ylabel: 'C (log scale)', xfmt: (v) => UI.sci(Math.pow(10, v)), yfmt: (v) => UI.sci(Math.pow(10, v)) });
    grid.forEach((row, i) => row.forEach((q, j) => { const v = val(q), t = (v - lo) / (hi - lo); p.rect(EXPS[j] - 0.5, EXPS[i] - 0.5, EXPS[j] + 0.5, EXPS[i] + 0.5, { fill: ramp(t), alpha: 1, stroke: col.surface, w: 2 }); const dark = t > 0.55; p.text(EXPS[j], EXPS[i], Math.round(v * 100) + '', { align: 'center', color: dark ? '#ffffff' : '#0b0b0b', weight: 700, size: 13 }); }));
    const gx = Math.log10(gScale); p.seg(gx, -2.5, gx, 3.5, { color: col.c[1], w: 2.4, dash: [6, 5] }); p.text(gx, 3.3, 'γ = “scale”', { color: col.c[1], align: 'center', weight: 700, halo: true, size: 12 });
    if (sel) p.rect(EXPS[sel[1]] - 0.5, EXPS[sel[0]] - 0.5, EXPS[sel[1]] + 0.5, EXPS[sel[0]] + 0.5, { stroke: col.ink, w: 3.2 });
    p.setLabel('Grid of ' + (metric === 'test' ? 'test' : metric === 'train' ? 'training' : 'support-vector share') + ' values over C and gamma');
  };
  G.plot.on('down', (e) => { const j = Math.round(e.x), i = Math.round(e.y); if (i >= EXPS[0] && i <= 3 && j >= EXPS[0] && j <= 3) select([i + 2, j + 2]); return false; });
  B.plot.draw = (p) => {
    const col = p.col; p.axes({ zero: false, xfmt: (v) => +v.toFixed(1) + '', yfmt: (v) => +v.toFixed(1) + '' }); if (!fitSel) return;
    const pts = data.Xtr.map((x, i) => ({ x: x[0], y: x[1], c: data.ytr[i] > 0 ? 1 : 0 })); fitSel.pts = pts; SU.drawModel(p, fitSel, { nx: 80, ny: 56, sv: false }); SU.drawPoints(p, pts, { r: 3.8 });
  };
  build();
})();
