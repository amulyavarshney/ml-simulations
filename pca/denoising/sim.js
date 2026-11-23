/* Denoising digits with PCA: noise level, k, error against clean images is U-shaped in k. */
(function () {
  'use strict';
  const { stage, side } = UI.shell('pca/denoising');
  const h = UI.h, dig = ML.data.digits(), X = dig.X, n = X.length;
  let sigma = 4, k = 12, seed = 0, picks = [], Z = null, noisy = null, fit = null, curve = [], bestK = 1, noisyMSE = 0;
  const pickSet = () => { const r = ML.rng(100 + seed), by = Array.from({ length: 10 }, () => []); dig.y.forEach((c, i) => by[c].push(i)); picks = by.map((l) => l[r.int(l.length)]); };
  function noiseMatrix() { const r = ML.rng(1000 + seed); Z = X.map(() => Float64Array.from({ length: 64 }, () => r.normal())); }
  noiseMatrix(); pickSet();

  const c = UI.panel(side, 'Noise and components');
  const sS = UI.slider(c, { label: 'Noise level σ (grey levels)', min: 0, max: 8, step: 0.25, value: sigma, fmt: (v) => v.toFixed(2), onInput(v) { sigma = v; recompute(); } });
  const kS = UI.slider(c, { label: 'Components kept, k', min: 1, max: 64, step: 1, value: k, fmt: (v) => String(Math.round(v)), onInput(v) { k = Math.round(v); refresh(); } });
  UI.buttons(c, [{ label: 'Variance target 50%', title: 'k that keeps 50% of the noisy data\'s variance', onClick() { k = fit.kFor(0.5); kS.set(k); refresh(); } }, { label: 'Best k', onClick() { k = bestK; kS.set(k); refresh(); } }, { label: 'New noise', onClick() { seed++; noiseMatrix(); pickSet(); recompute(); } }]);
  UI.note(c, 'The PCA is fitted on the <b>noisy</b> images; error is measured against the <b>clean</b> ones. Pixel values are not clipped when fitting (clipped only for display).');
  const rd = UI.panel(side, 'Readouts'), R = UI.read(rd, [{ id: 'noisy', label: 'Error of the noisy input (MSE)' }, { id: 'den', label: 'Error after PCA at your k' }, { id: 'gain', label: 'Error removed' }, { id: 'best', label: 'Best k (lowest error)' }, { id: 'var', label: 'Variance kept at your k' }, { id: 'v50', label: 'k for a 50% variance target' }]);

  const G = UI.plotCard(stage, 'Clean, noisy and denoised digits', { xlim: [0, 1], ylim: [0, 1], aspect: 3.1, margin: { l: 84, r: 8, t: 8, b: 8 }, label: 'Ten digits: clean, with noise, and after PCA denoising' });
  const E = UI.plotCard(stage, 'Error against the clean digits, by number of components', { xlim: [0, 65], ylim: [0, 10], aspect: 2.3, margin: { l: 56, b: 42 }, hover: true, label: 'Mean squared error against clean digits as k grows' }, 'Too few components blur the digit; too many let the noise back in. At k = 64 nothing is removed, so the error equals the noisy input\'s.');
  UI.legend(E.card, [{ label: 'error after PCA with k components', color: UI.colors().c[0], shape: 'line' }, { label: 'error of the noisy input', color: UI.colors().c[1], shape: 'dash' }]);

  function recompute() {
    noisy = X.map((r, i) => { const o = new Float64Array(64); for (let j = 0; j < 64; j++) o[j] = r[j] + sigma * Z[i][j]; return o; });
    fit = ML.pca(noisy); const sums = new Float64Array(65), vec = fit.components;
    noisyMSE = 0; for (let i = 0; i < n; i++) for (let j = 0; j < 64; j++) { const t = noisy[i][j] - X[i][j]; noisyMSE += t * t; } noisyMSE /= n * 64;
    for (let i = 0; i < n; i++) {
      const z = fit.standardise(noisy[i]), rec = Float64Array.from(fit.mean);
      for (let a = 0; a < 64; a++) { const s = ML.dot(z, vec[a]), v = vec[a]; let e = 0; for (let j = 0; j < 64; j++) { rec[j] += s * v[j]; const t = rec[j] - X[i][j]; e += t * t; } sums[a + 1] += e; }
    }
    curve = []; bestK = 1; let best = Infinity; for (let a = 1; a <= 64; a++) { const m = sums[a] / (n * 64); curve.push(m); if (m < best - 1e-12) { best = m; bestK = a; } }
    refresh();
  }
  function refresh() {
    const m = curve[k - 1];
    R.set('noisy', UI.f(noisyMSE, 2)); R.set('den', UI.f(m, 2)); const g = noisyMSE > 0 ? 1 - m / noisyMSE : null; /* a share that rounds to zero is shown as 0%, never -0% */
    R.set('gain', g === null ? '–' : UI.pct(Math.abs(g) < 0.005 ? 0 : g, 0), g !== null && g >= 0.005 ? 'good' : ''); R.set('best', bestK + ' (error ' + UI.f(curve[bestK - 1], 2) + ')'); R.set('var', UI.pct(fit.cum[k - 1], 1)); R.set('v50', String(fit.kFor(0.5)));
    G.plot.redraw(); E.plot.redraw();
  }
  G.plot.draw = (p, c) => {
    const col = p.col, W = p.W - p.m.l - p.m.r, gx = W / 10, tile = Math.min(gx - 4, (p.H - 26) / 3 - 4), cl = (v) => Float64Array.from(v, (x) => Math.min(16, Math.max(0, x)));
    picks.forEach((idx, j) => { const x = p.m.l + j * gx + (gx - tile) / 2; UI.drawDigit(c, X[idx], x, 6, tile, col); UI.drawDigit(c, cl(noisy[idx]), x, 6 + (tile + 6), tile, col); UI.drawDigit(c, cl(fit.reconstruct(noisy[idx], k)), x, 6 + 2 * (tile + 6), tile, col); });
    [['clean', 0, col.ink2], ['noisy', 1, col.c[1]], ['k = ' + k, 2, col.accent]].forEach(([t, r, cc]) => p.text(p.m.l - 10, 6 + r * (tile + 6) + tile / 2, t, { px: true, align: 'right', color: cc, size: 12.5, weight: 700 }));
    p.setLabel('Ten digits shown clean, with noise of level ' + sigma + ', and denoised with ' + k + ' components.');
  };
  E.plot.draw = (p, c) => {
    const col = p.col, top = Math.max(noisyMSE, curve[0], 1) * 1.15; p.setLims(null, [0, top]); p._layout();
    p.axes({ xlabel: 'components kept, k', ylabel: 'mean squared error', xticks: [0, 8, 16, 24, 32, 40, 48, 56, 64] });
    p.seg(0, noisyMSE, 65, noisyMSE, { color: col.c[1], w: 2, dash: [6, 5] });
    p.line(curve.map((v, i) => [i + 1, v]), { color: col.c[0], w: 3 });
    p.seg(k, 0, k, curve[k - 1], { color: col.accent, w: 1.4, dash: [3, 3] }); p.dot(k, curve[k - 1], { fill: col.accent, r: 6.5 });
    p.dot(bestK, curve[bestK - 1], { fill: col.c[2], r: 6, shape: 'diamond' }); p.text(bestK, curve[bestK - 1], 'best k = ' + bestK, { color: col.ink, weight: 700, dx: 11, dy: -12, halo: true });
  };
  E.plot.on('hover', (e) => { const i = Math.round(e.x); if (i < 1 || i > 64) return UI.tip.hide(); UI.tip.show('k = ' + i + '<br>error ' + UI.f(curve[i - 1], 2), e.cx, e.cy); });
  recompute();
})();
