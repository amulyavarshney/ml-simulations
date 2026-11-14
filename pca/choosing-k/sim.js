/* Choosing k on the digits: scree, cumulative variance, target, reconstructions, exact error identity. */
(function () {
  'use strict';
  const { stage, side } = UI.shell('pca/choosing-k');
  const h = UI.h, dig = ML.data.digits(), X = dig.X, n = X.length, fit = ML.pca(X);
  let k = 29, target = 0.95, seed = 3, picks = [], measured = 0;
  const choose = () => { const r = ML.rng(seed), by = Array.from({ length: 10 }, () => []); dig.y.forEach((c, i) => by[c].push(i)); picks = by.map((l) => l[r.int(l.length)]); };
  choose();
  let totalSS = 0; for (const r of X) for (let j = 0; j < 64; j++) { const t = r[j] - fit.mean[j]; totalSS += t * t; }

  UI.predict(side, { q: 'How many of the 64 components keep <b>95%</b> of the variance in the digits data?', options: ['8', '15', '29', '45'], answer: 2, reveal: '29, nearly half. The variance curve has no sharp elbow, so a target (or cross-validation) gives k, not the scree plot alone.' });
  const c = UI.panel(side, 'Choose k');
  const kS = UI.slider(c, { label: 'Components kept, k', min: 1, max: 64, step: 1, value: k, fmt: (v) => String(Math.round(v)), onInput(v) { k = Math.round(v); target = fit.cum[k - 1]; tS.set(Math.max(0.5, Math.min(0.999, target))); update(); } });
  const tS = UI.slider(c, { label: 'Or set a variance target', min: 0.5, max: 0.999, step: 0.001, value: target, fmt: (v) => UI.pct(v, 1), help: 'Moves k to the smallest value that reaches the target.', onInput(v) { target = v; k = fit.kFor(v); kS.set(k); update(); } });
  UI.buttons(c, [{ label: '90%', onClick() { tS.set(0.9); target = 0.9; k = fit.kFor(0.9); kS.set(k); update(); } }, { label: '95%', onClick() { tS.set(0.95); target = 0.95; k = fit.kFor(0.95); kS.set(k); update(); } }, { label: '99%', onClick() { tS.set(0.99); target = 0.99; k = fit.kFor(0.99); kS.set(k); update(); } }, { label: 'New digits', onClick() { seed++; choose(); update(); } }]);
  const rd = UI.panel(side, 'Readouts'), R = UI.read(rd, [{ id: 'cum', label: 'Variance kept (cumulative)' }, { id: 'lost', label: '1 − cumulative variance' }, { id: 'meas', label: 'Squared error left ÷ total' }, { id: 'diff', label: 'Difference' }, { id: 'store', label: 'Numbers stored per image' }]);

  const row = h('div', { class: 'row' }); stage.append(row);
  const S = UI.plotCard(row, 'Scree: variance per component', { xlim: [0, 21], ylim: [0, 16], aspect: 1.5, margin: { l: 50, b: 42 }, hover: true, label: 'Scree plot of the first twenty components' }, 'Gradual decline, no clear elbow.');
  const Cm = UI.plotCard(row, 'Cumulative variance kept', { xlim: [0, 65], ylim: [0, 102], aspect: 1.5, margin: { l: 50, b: 42 }, hover: true, label: 'Cumulative explained variance against number of components' }, 'Dashed line: your target. The marker shows k.');
  const G = UI.plotCard(stage, 'Reconstructions with k components', { xlim: [0, 1], ylim: [0, 1], aspect: 4.2, margin: { l: 84, r: 8, t: 8, b: 8 }, label: 'Ten digits and their reconstructions' }, 'Each digit is stored as k numbers and rebuilt as the mean image plus k weighted component images.');

  S.plot.draw = (p, c) => {
    const col = p.col; p.axes({ xlabel: 'principal component', ylabel: '% of variance', xticks: [1, 5, 10, 15, 20] });
    for (let i = 0; i < 20; i++) p.rect(i + 0.6, 0, i + 1.4, 100 * fit.ratio[i], { fill: i < k ? col.c[0] : col.axis, alpha: i < k ? 0.95 : 0.9 });
    if (k > 20) p.text(20.7, 14, 'k = ' + k + ' (off the chart)', { align: 'right', color: col.ink2, size: 11.5 });
  };
  S.plot.on('hover', (e) => { const i = Math.round(e.x) - 1; if (i < 0 || i >= 20 || e.y < 0 || e.y > 100 * fit.ratio[i] + 0.5) return UI.tip.hide(); UI.tip.show('PC' + (i + 1) + ': ' + UI.f(100 * fit.ratio[i], 1) + '% of variance', e.cx, e.cy); });
  Cm.plot.draw = (p, c) => {
    const col = p.col; p.axes({ xlabel: 'number of components, k', ylabel: '% variance kept', xticks: [0, 8, 16, 24, 32, 40, 48, 56, 64] });
    const pts = [[0, 0]].concat(fit.cum.map((v, i) => [i + 1, 100 * v]));
    p.seg(0, 100 * target, 65, 100 * target, { color: col.c[1], w: 1.6, dash: [6, 5] }); p.text(64.5, 100 * target, UI.pct(target, 0) + ' target', { align: 'right', dy: -10, color: col.c[1], weight: 700, size: 12 });
    p.line(pts, { color: col.c[0], w: 3 }); p.seg(k, 0, k, 100 * fit.cum[k - 1], { color: col.accent, w: 1.4, dash: [3, 3] });
    p.dot(k, 100 * fit.cum[k - 1], { fill: col.accent, r: 6.5 }); p.text(k, 100 * fit.cum[k - 1], 'k = ' + k, { color: col.ink, weight: 700, dx: k > 50 ? -10 : 10, align: k > 50 ? 'right' : 'left', dy: 14, halo: true });
  };
  Cm.plot.on('hover', (e) => { const i = Math.round(e.x); if (i < 1 || i > 64) return UI.tip.hide(); UI.tip.show('k = ' + i + ': ' + UI.f(100 * fit.cum[i - 1], 1) + '% kept', e.cx, e.cy); });
  G.plot.draw = (p, c) => {
    const col = p.col, tile = Math.min((p.W - p.m.l - p.m.r) / 10 - 4, (p.H - 24) / 2 - 6), gx = (p.W - p.m.l - p.m.r) / 10;
    picks.forEach((idx, j) => { const x = p.m.l + j * gx + (gx - tile) / 2; UI.drawDigit(c, X[idx], x, 6, tile, col); UI.drawDigit(c, fit.reconstruct(X[idx], k), x, 6 + tile + 10, tile, col); });
    p.text(p.m.l - 10, 6 + tile / 2, 'original', { px: true, align: 'right', color: col.ink2, size: 12.5, weight: 600 }); p.text(p.m.l - 10, 6 + tile * 1.5 + 10, 'k = ' + k, { px: true, align: 'right', color: col.accent, size: 12.5, weight: 700 });
    p.setLabel('Ten handwritten digits shown original and rebuilt from ' + k + ' components.');
  };
  function update() {
    let err = 0; for (const r of X) { const rec = fit.reconstruct(r, k); for (let j = 0; j < 64; j++) { const t = r[j] - rec[j]; err += t * t; } }
    measured = err / totalSS; const lost = 1 - fit.cum[k - 1];
    R.set('cum', UI.pct(fit.cum[k - 1], 2)); R.set('lost', UI.pct(lost, 2)); R.set('meas', UI.pct(measured, 2)); R.set('diff', Math.abs(measured - lost).toExponential(1)); R.set('store', k + ' instead of 64 (' + UI.f(64 / k, 1) + '× smaller)');
    S.plot.redraw(); Cm.plot.redraw(); G.plot.redraw();
  }
  update();
})();
