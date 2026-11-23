/* Scaling and PCA on the wine data: unit lab, loadings, scores, neighbour purity. */
(function () {
  'use strict';
  const { stage, side } = UI.shell('pca/scaling');
  const h = UI.h, wine = ML.data.wine(), F = wine.features, d = F.length;
  const short = ['alcohol', 'malic acid', 'ash', 'alcalinity of ash', 'magnesium', 'total phenols', 'flavanoids', 'nonflavanoid phenols', 'proanthocyanins', 'colour intensity', 'hue', 'OD280/OD315', 'proline'];
  const mult = new Array(d).fill(1); let sel = 12, scale = false, fit = null, Z = null, purity = 0;

  UI.predict(side, { q: 'On the <b>unscaled</b> wine data, which feature will dominate PC1?', options: ['Alcohol', 'Magnesium', 'Colour intensity', 'Proline'], answer: 3,
    reveal: 'Proline. Its standard deviation is about 314, against 14 for magnesium and about 1 for most others, so it carries 99.8% of the variance. Now try the controls below.' });
  const c1 = UI.panel(side, 'Preprocessing');
  UI.seg(c1, { label: 'Standardise features first?', options: [{ value: 'off', label: 'Off (raw units)' }, { value: 'on', label: 'On (mean 0, sd 1)' }], value: 'off', onChange(v) { scale = v === 'on'; update(); } });
  const c2 = UI.panel(side, 'Unit lab');
  const fsel = UI.select(c2, { label: 'Change the unit of', options: short.map((n, i) => ({ value: i, label: n })), value: sel, onChange(v) { sel = +v; sl.set(mult[sel]); } });
  const sl = UI.slider(c2, { label: 'Unit multiplier', min: 0.001, max: 1000, log: true, value: 1, fmt: (v) => '× ' + (v >= 1 ? +v.toPrecision(3) : +v.toPrecision(2)), help: 'Multiplying a column by 1000 is the same as reporting it in a unit 1000 times smaller.', onInput(v) { mult[sel] = v; update(); } });
  UI.buttons(c2, [{ label: 'Reset all units', onClick() { mult.fill(1); sl.set(1); update(); } }]);
  const rd = UI.panel(side, 'Readouts'), R = UI.read(rd, [{ id: 'pc1', label: 'PC1 explains' }, { id: 'pc2', label: 'PC2 explains' }, { id: 'top', label: 'Largest PC1 loading' }, { id: 'pur', label: 'Neighbour purity in PC1–PC2 map', title: 'Share of each point\'s 10 nearest neighbours in the 2-D map that belong to the same cultivar' }]);

  const row = h('div', { class: 'row' }); stage.append(row);
  const P1 = UI.plotCard(row, 'Spread of each feature (standard deviation)', { xlim: [-1.4, 3.3], ylim: [-0.6, d - 0.4], aspect: 1.05, margin: { l: 124, r: 12, t: 8, b: 40 }, hover: true, label: 'Bar chart of feature standard deviations on a log scale' }, 'This is what PCA sees. Log scale: each gridline is 10× the last.');
  const P2 = UI.plotCard(row, 'PC1 loadings', { xlim: [-1.05, 1.05], ylim: [-0.6, d - 0.4], aspect: 1.05, margin: { l: 16, r: 12, t: 8, b: 40 }, hover: true, label: 'Bar chart of PC1 loadings' }, 'Weight each feature gets in PC1. A loading near ±1 means PC1 is nearly that one feature.');
  const P3 = UI.plotCard(stage, 'The wines in the first two components', { xlim: [-4, 4], ylim: [-4, 4], aspect: 1.9, margin: { l: 52, r: 12, t: 10, b: 42 }, hover: true, label: 'Scatter of wines on PC1 and PC2 coloured by cultivar' });
  UI.legend(P3.card, [0, 1, 2].map((k) => ({ label: 'Cultivar ' + (k + 1), color: UI.cls(k).color, shape: UI.cls(k).shape })));

  function update() {
    const Xm = wine.X.map((r) => { const o = new Float64Array(d); for (let j = 0; j < d; j++) o[j] = r[j] * mult[j]; return o; });
    fit = ML.pca(Xm, { scale }); Z = fit.transform(Xm, 2);
    const sd = scale ? new Float64Array(d).fill(1) : ML.colStd(Xm); fit.sd = sd;
    purity = ML.neighbourPurity(Z, wine.y, 10);
    const ld = fit.components[0]; let top = 0; ld.forEach((v, j) => { if (Math.abs(v) > Math.abs(ld[top])) top = j; });
    R.set('pc1', UI.pct(fit.ratio[0])); R.set('pc2', UI.pct(fit.ratio[1])); R.set('top', short[top] + ' (' + UI.f(Math.abs(ld[top]), 2) + ')', Math.abs(ld[top]) > 0.9 ? 'warn' : ''); R.set('pur', UI.pct(purity, 0), purity > 0.85 ? 'good' : purity < 0.75 ? 'warn' : '');
    fit.top = top; P1.plot.redraw(); P2.plot.redraw(); P3.plot.redraw();
  }
  const rows = (p) => { p.ctx.save(); p.ctx.font = '12px ' + getComputedStyle(document.body).fontFamily; };
  P1.plot.draw = (p, c) => {
    /* size the left margin to the longest feature name, so labels fit even on a 390 px wide screen */
    const fs = p.W < 420 ? 11 : 12; p.ctx.save(); p.ctx.font = '700 ' + fs + 'px ' + getComputedStyle(document.body).fontFamily;
    const need = Math.ceil(Math.max.apply(null, short.map((t) => p.ctx.measureText(t).width))) + 14; p.ctx.restore();
    if (Math.abs(p.m.l - need) > 0.5) { p.m.l = need; p._layout(); }
    const col = p.col; p.axes({ yticks: [], xticks: [-1, 0, 1, 2, 3], xfmt: (v) => +Math.pow(10, v).toPrecision(2) + '', xlabel: 'standard deviation (log scale)' });
    for (let j = 0; j < d; j++) {
      const y = d - 1 - j, v = Math.log10(Math.max(fit.sd[j], 1e-3)), dom = j === fit.top && !scale && fit.ratio[0] > 0.9;
      p.rect(p.vx[0], y - 0.32, Math.min(v, p.vx[1]), y + 0.32, { fill: dom ? col.c[1] : col.c[0], alpha: dom ? 1 : 0.85 });
      p.text(p.m.l - 8, p.Y(y), short[j], { px: true, align: 'right', color: j === sel ? col.ink : col.ink2, weight: j === sel ? 700 : 500, size: fs });
    }
    p.seg(0, p.vy[0], 0, p.vy[1], { color: col.axis, w: 1.2, dash: [3, 3] }); p.text(0, d - 0.35, 'sd = 1', { color: col.muted, size: 11, dx: 5 });
  };
  P1.plot.on('hover', (e) => { const j = d - 1 - Math.round(e.y); if (j < 0 || j >= d || e.px < P1.plot.m.l - 120) return UI.tip.hide(); UI.tip.show('<b>' + short[j] + '</b><br>sd = ' + UI.sci(fit.sd[j]), e.cx, e.cy); });
  P2.plot.draw = (p, c) => {
    const col = p.col, ld = fit.components[0]; p.axes({ yticks: [], xticks: [-1, -0.5, 0, 0.5, 1], xlabel: 'loading on PC1', zero: true });
    for (let j = 0; j < d; j++) { const y = d - 1 - j, v = ld[j]; p.rect(0, y - 0.32, v, y + 0.32, { fill: v >= 0 ? col.c[0] : col.c[1], alpha: 0.9 }); }
    p.text(0.98, 0.05 - 0.6 + 0.2, '', {});
  };
  P2.plot.on('hover', (e) => { const j = d - 1 - Math.round(e.y); if (j < 0 || j >= d) return UI.tip.hide(); UI.tip.show('<b>' + short[j] + '</b><br>loading ' + UI.f(fit.components[0][j], 3), e.cx, e.cy); });
  P3.plot.draw = (p, c) => {
    const col = p.col; let mx = 0, my = 0; Z.forEach((z) => { mx = Math.max(mx, Math.abs(z[0])); my = Math.max(my, Math.abs(z[1])); });
    const rx = mx * 1.08 || 1, ry = my * 1.08 || 1; p.setLims([-rx, rx], [-ry, ry]); p._layout();
    p.axes({ zero: true, xlabel: 'PC1 (' + UI.pct(fit.ratio[0]) + ' of variance)', ylabel: 'PC2 (' + UI.pct(fit.ratio[1]) + ')', xfmt: (v) => +v.toPrecision(3) + '', yfmt: (v) => +v.toPrecision(3) + '' });
    for (let k = 0; k < 3; k++) { const st = UI.cls(k); Z.forEach((z, i) => { if (wine.y[i] === k) p.dot(z[0], z[1], { fill: st.color, shape: st.shape, r: 4.3, alpha: .9 }); }); }
    p.setLabel('Scatter of 178 wines on PC1 and PC2. Neighbour purity is ' + UI.pct(purity, 0) + '.');
  };
  P3.plot.on('hover', (e) => { let best = -1, bd = 10; Z.forEach((z, i) => { const dd = Math.hypot(P3.plot.X(z[0]) - e.px, P3.plot.Y(z[1]) - e.py); if (dd < bd) { bd = dd; best = i; } }); if (best < 0) return UI.tip.hide(); UI.tip.show('Wine ' + (best + 1) + ' · cultivar ' + (wine.y[best] + 1), e.cx, e.cy); });
  update();
})();
