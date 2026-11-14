/* Cost and choice: time an RBF SVM against n and fit the exponent; compare SVM, logistic regression and a tree. */
(function () {
  'use strict';
  const { stage, side } = UI.shell('svm-beyond/cost-and-choice');
  const h = UI.h;
  const NS = [250, 500, 1000, 2000, 3000], BIG = 64000;
  let noise = 0.3, runAnim = null, measured = [], fit = null, big = null, ds = 'moons', ntr = 1000, cmp = null;

  const c = UI.panel(side, '1 · Time the SVM');
  UI.slider(c, { label: 'Noise in the moons data', min: 0.1, max: 0.6, step: 0.05, value: noise, fmt: (v) => v.toFixed(2), help: 'Noisier data means more support vectors and more solver work.', onInput(v) { noise = v; } });
  const b1 = UI.buttons(c, [{ id: 'run', label: 'Time n = 250 … 3000', primary: true, onClick() { runTiming(); } }, { id: 'big', label: 'Time the cheap models at 64,000 rows', onClick() { runBig(); } }]);
  b1.big.disabled = true;
  const pg = UI.progress(c);
  const rd = UI.panel(side, 'Timing readouts'), R = UI.read(rd, [{ id: 'exp', label: 'Fitted exponent (time ∝ nᵉ)' }, { id: 't3', label: 'Time at n = 3000' }, { id: 'x', label: 'Extrapolated to 64,000 rows' }, { id: 'mem', label: 'Full kernel matrix at 64,000 rows' }]);
  const c2 = UI.panel(side, '2 · Which model for which data');
  UI.select(c2, { label: 'Data', options: [{ value: 'moons', label: 'Two moons' }, { value: 'circles', label: 'Rings' }, { value: 'xor', label: 'XOR corners' }, { value: 'blobs', label: 'Linearly separable groups' }], value: ds, onChange(v) { ds = v; compare(); } });
  UI.select(c2, { label: 'Training rows', options: [200, 500, 1000, 2000, 3000].map((n) => ({ value: n, label: String(n) })), value: ntr, onChange(v) { ntr = +v; compare(); } });
  UI.note(c2, 'Test accuracy is measured on 1,000 fresh rows. Times are fit times in your browser.');

  const A = UI.plotCard(stage, 'SVM training time against the number of rows (log–log)', { xlim: [Math.log10(150), Math.log10(80000)], ylim: [-1, 3], aspect: 1.9, margin: { l: 62, r: 14, t: 12, b: 46 }, hover: true, label: 'Training time against rows on log axes with a fitted line and an extrapolation' }, 'Dots: measured. Line: least-squares fit. Dashed extension: <b>extrapolated, not measured</b>. A straight line of slope 2 means doubling n quadruples the time.');
  const T = h('section', { class: 'card panel' }, h('h3', { text: 'Model comparison' })), tb = h('div'); T.append(tb); stage.append(T);

  const ticks = (a, b) => { const o = []; for (let e = Math.ceil(a); e <= Math.floor(b); e++) o.push(e); return o; };
  const human = (ms) => (ms < 1000 ? UI.f(ms, ms < 10 ? 1 : 0) + ' ms' : ms < 60000 ? UI.f(ms / 1000, 1) + ' s' : ms < 3.6e6 ? UI.f(ms / 60000, 1) + ' min' : UI.f(ms / 3.6e6, 1) + ' h');
  const moons = (n, s) => { const d = ML.data.moons(n, noise, ML.rng(s)); return { X: d.X, y: d.y.map((v) => (v ? 1 : -1)) }; };
  function runTiming() {
    if (runAnim) runAnim.stop(); measured = []; fit = null; big = null; b1.big.disabled = true; b1.run.disabled = true; let i = 0; R.set('exp', '…'); R.set('t3', '…'); R.set('x', '…'); R.set('mem', '…');
    runAnim = UI.animate(() => {
      const n = NS[i], reps = n <= 500 ? 5 : n <= 1000 ? 3 : 1; let best = Infinity;
      for (let r = 0; r < reps; r++) { const d = moons(n, 5 + r), t0 = performance.now(); ML.svc(d.X, d.y, { kernel: 'rbf', gamma: ML.gammaScale(d.X), C: 10 }); best = Math.min(best, performance.now() - t0); }
      measured.push({ n, ms: Math.max(best, 0.05) }); i++; pg.set(i / NS.length); if (i === NS.length) finishTiming(); else A.plot.redraw(); return i < NS.length;
    }, () => A.plot.redraw(), { budget: 5 }); runAnim.start();
  }
  function finishTiming() {
    const lx = measured.map((q) => Math.log10(q.n)), ly = measured.map((q) => Math.log10(q.ms)), mx = ML.mean(lx), my = ML.mean(ly); let sxy = 0, sxx = 0; lx.forEach((v, i) => { sxy += (v - mx) * (ly[i] - my); sxx += (v - mx) * (v - mx); });
    const slope = sxy / sxx, icpt = my - slope * mx; fit = { slope, icpt }; const xms = Math.pow(10, icpt + slope * Math.log10(BIG)), last = measured[measured.length - 1];
    R.set('exp', UI.f(slope, 2), 'good'); R.set('t3', human(last.ms)); R.set('x', human(xms) + ' (extrapolated)', 'warn'); R.set('mem', UI.f(BIG * BIG * 8 / 1e9, 1) + ' GB if stored in full'); b1.run.disabled = false; b1.big.disabled = false; A.plot.redraw(); compare();
  }
  /* a small CART tree (Gini, depth-limited) */
  function tree(X, y, depth) {
    const build = (idx, d) => {
      let pos = 0; for (const i of idx) if (y[i] > 0) pos++; const maj = pos * 2 >= idx.length ? 1 : -1;
      if (d === 0 || pos === 0 || pos === idx.length || idx.length < 4) return { leaf: maj };
      let best = null; const tot = idx.length, g0 = (p) => 2 * p * (1 - p);
      for (let f = 0; f < 2; f++) { const s = idx.slice().sort((a, b) => X[a][f] - X[b][f]); let lp = 0; for (let k = 0; k < s.length - 1; k++) { if (y[s[k]] > 0) lp++; if (X[s[k]][f] === X[s[k + 1]][f]) continue; const nl = k + 1, nr = tot - nl, rp = pos - lp, g = (nl * g0(lp / nl) + nr * g0(rp / nr)) / tot; if (!best || g < best.g) best = { g, f, t: (X[s[k]][f] + X[s[k + 1]][f]) / 2 }; } }
      if (!best) return { leaf: maj }; const L = [], Rr = []; for (const i of idx) (X[i][best.f] <= best.t ? L : Rr).push(i); if (!L.length || !Rr.length) return { leaf: maj };
      return { f: best.f, t: best.t, l: build(L, d - 1), r: build(Rr, d - 1) };
    };
    const root = build(Array.from(X.keys()), depth); return (x) => { let nd = root; while (nd.leaf === undefined) nd = x[nd.f] <= nd.t ? nd.l : nd.r; return nd.leaf; };
  }
  const gen = (name, n, s) => { const r = ML.rng(s); let d; if (name === 'moons') d = ML.data.moons(n, 0.25, r); else if (name === 'circles') d = ML.data.circles(n, 0.1, 0.5, r); else if (name === 'xor') d = ML.data.xor(n, 0.25, r); else d = ML.data.blobs([[-1.3, -0.6], [1.3, 0.6]], [Math.floor(n / 2), n - Math.floor(n / 2)], [0.6, 0.6], r); return { X: d.X, y: d.y.map((v) => (v ? 1 : -1)) }; };
  function compare() {
    const tr = gen(ds, ntr, 21), te = gen(ds, 1000, 99), rows = [];
    const acc = (pred) => te.X.filter((x, i) => pred(x) === te.y[i]).length / te.X.length;
    let t0 = performance.now(); const sv = ML.svc(tr.X, tr.y, { kernel: 'rbf', gamma: ML.gammaScale(tr.X), C: 10, maxMs: 4000 }); rows.push({ name: 'SVM, RBF kernel (C = 10, γ = “scale”)', acc: acc((x) => sv.predict(x)), ms: performance.now() - t0 });
    t0 = performance.now(); const lr = ML.logreg(tr.X, tr.y, { C: 1 }); rows.push({ name: 'Logistic regression (a straight boundary)', acc: acc((x) => (lr.decision(x) >= 0 ? 1 : -1)), ms: performance.now() - t0 });
    t0 = performance.now(); const tf = tree(tr.X, tr.y, 6); rows.push({ name: 'Decision tree (depth 6)', acc: acc(tf), ms: performance.now() - t0 });
    cmp = rows; const best = Math.max(...rows.map((q) => q.acc)), maxMs = Math.max(...rows.map((q) => q.ms));
    tb.textContent = ''; tb.append(h('table', { class: 't' }, h('thead', null, h('tr', null, ['model', 'test accuracy', 'fit time'].map((t) => h('th', { text: t })))), h('tbody', null, rows.map((q) => h('tr', null, h('td', { text: q.name }), h('td', { style: { fontWeight: q.acc >= best - 1e-9 ? 800 : 500 }, text: UI.pct(q.acc, 1) }), h('td', { text: human(q.ms) })))), big ? h('tfoot', null, h('tr', null, h('td', { colSpan: 3, class: 'note', html: 'At <b>64,000 rows</b> (moons data): logistic regression took <b>' + human(big.lr) + '</b>, the tree <b>' + human(big.tree) + '</b>, while the SVM is extrapolated to <b>' + human(big.svm) + '</b>.' }))) : null));
    tb.append(h('p', { class: 'note', html: ds === 'blobs' ? 'On data a straight line already separates, the cheap model matches the SVM.' : ds === 'xor' ? 'A straight boundary cannot separate XOR; the SVM and the tree can.' : 'A straight boundary cannot follow curved classes; the SVM and the tree can. The tree is the cheaper of the two as the data grows.' }));
  }
  function runBig() {
    b1.big.disabled = true; const d = moons(BIG, 9);
    setTimeout(() => { let t0 = performance.now(); ML.logreg(d.X, d.y, { C: 1 }); const lr = performance.now() - t0; t0 = performance.now(); tree(d.X, d.y, 6); const tr = performance.now() - t0; big = { lr, tree: tr, svm: Math.pow(10, fit.icpt + fit.slope * Math.log10(BIG)) }; b1.big.disabled = false; compare(); }, 30);
  }
  A.plot.draw = (p) => {
    const col = p.col; p.axes({ xlabel: 'training rows n (log scale)', ylabel: 'training time (log scale)', xticks: [2, 3, 4, 4.806], yticks: [-1, 0, 1, 2, 3], xfmt: (v) => (v === 4.806 ? '64,000' : UI.sci(Math.pow(10, v))), yfmt: (v) => (v >= 3 ? '1 s' : v >= 2 ? '100 ms' : v >= 1 ? '10 ms' : v >= 0 ? '1 ms' : '0.1 ms') });
    if (fit) { const a = Math.log10(250), b = Math.log10(BIG); p.line([[a, fit.icpt + fit.slope * a], [Math.log10(3000), fit.icpt + fit.slope * Math.log10(3000)]], { color: col.c[0], w: 2.4 }); p.line([[Math.log10(3000), fit.icpt + fit.slope * Math.log10(3000)], [b, fit.icpt + fit.slope * b]], { color: col.c[1], w: 2.4, dash: [7, 5] }); p.dot(b, fit.icpt + fit.slope * b, { fill: col.c[1], shape: 'diamond', r: 7 }); p.text(b, fit.icpt + fit.slope * b, 'extrapolated: ' + human(Math.pow(10, fit.icpt + fit.slope * b)), { align: 'right', dx: -12, dy: -2, color: col.ink, weight: 700, size: 12, halo: true }); }
    measured.forEach((q) => p.dot(Math.log10(q.n), Math.log10(q.ms), { fill: col.c[0], r: 5.5 }));
    if (!measured.length) p.text(3.2, 1.6, 'Press “Time n = 250 … 3000”', { align: 'center', color: col.muted, size: 14 });
  };
  A.plot.on('hover', (e) => { const q = measured.reduce((a, b) => (!a || Math.abs(Math.log10(b.n) - e.x) < Math.abs(Math.log10(a.n) - e.x) ? b : a), null); if (!q || Math.abs(Math.log10(q.n) - e.x) > 0.15) return UI.tip.hide(); UI.tip.show('n = ' + q.n + '<br>' + human(q.ms), e.cx, e.cy); });
  compare(); A.plot.redraw(); runTiming();
})();
