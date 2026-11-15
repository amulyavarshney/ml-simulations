/* Learning curve: training and 5-fold CV score against the number of training rows, with a plain-language diagnosis. */
(function () {
  'use strict';
  const { stage, side } = UI.shell('evaluation/learning-curve');
  const h = UI.h, NP = 600, SIZES = [20, 30, 45, 70, 100, 150, 220, 320, 480];
  const MODELS = {
    simple: { label: 'Simple: a straight line', fit: (X, y) => { const m = ML.logreg(X, y, { C: 1 }); return (x) => (m.decision(x) > 0 ? 1 : -1); } },
    medium: { label: 'Medium: RBF SVM, γ = 1, C = 1', fit: (X, y) => { const m = ML.svc(X, y, { kernel: 'rbf', gamma: 1, C: 1, maxMs: 400 }); return (x) => m.predict(x); } },
    flexible: { label: 'Flexible: RBF SVM, γ = 50, C = 100', fit: (X, y) => { const m = ML.svc(X, y, { kernel: 'rbf', gamma: 50, C: 100, maxMs: 400 }); return (x) => m.predict(x); } },
  };
  let model = 'flexible', kind = 'moons', noise = 0.3, seed = 5, curve = [], ceiling = null, job = null, gen = 0;

  const c = UI.panel(side, 'Model');
  UI.seg(c, { label: 'How flexible is the model?', options: Object.keys(MODELS).map((k) => ({ value: k, label: k[0].toUpperCase() + k.slice(1) })), value: model, onChange(v) { model = v; run(); } });
  const mnote = UI.note(c, MODELS[model].label);
  const d = UI.panel(side, 'Data');
  UI.seg(d, { label: 'Shape', options: [{ value: 'moons', label: 'Moons' }, { value: 'rings', label: 'Rings' }], value: kind, onChange(v) { kind = v; run(); } });
  UI.slider(d, { label: 'Noise', min: 0.1, max: 0.5, step: 0.05, value: noise, fmt: (v) => v.toFixed(2), onInput: UI.debounce((v) => { noise = v; run(); }, 250) });
  UI.buttons(d, [{ label: 'New data', primary: true, onClick() { seed++; run(); } }]);
  UI.note(d, NP + ' rows in all. Each point on the curve fits the model on the first s rows of the training part of each of 5 folds, and scores it on those s rows (training) and on the held-out fold (validation).');
  const pg = UI.progress(d);
  const rd = UI.panel(side, 'At the largest size (480 rows)'), R = UI.read(rd, [{ id: 'tr', label: 'Training score' }, { id: 'cv', label: 'Validation score' }, { id: 'gap', label: 'Gap' }, { id: 'ceil', label: 'About the best any model could do' }, { id: 'rise', label: 'Validation gain: 320\u2013480 rows against 150\u2013220' }]);
  const dx = h('p', { class: 'note callout', role: 'status' }); rd.append(dx);

  const P = UI.plotCard(stage, 'Score against the number of training rows', { xlim: [Math.log10(16), Math.log10(560)], ylim: [0.5, 1.02], aspect: 1.8, margin: { l: 54, r: 14, t: 12, b: 44 }, hover: true, label: 'Training and validation score against training-set size' }, 'Bands show ±1 standard deviation over the five folds. The dotted line is an estimate of the best any model could do on this data: a 25-nearest-neighbour model trained on 3,000 rows and scored on 1,500 fresh ones.');
  UI.legend(P.card, [{ label: 'training score', color: UI.colors().c[1], shape: 'dash' }, { label: 'validation (CV) score', color: UI.colors().c[0], shape: 'line' }, { label: 'about the best possible', color: UI.colors().muted, shape: 'dash' }]);
  const pool = (k, nz, sd, N) => { const r = ML.rng(sd * 211 + 3), d0 = k === 'moons' ? ML.data.moons(N, nz, r) : ML.data.circles(N, nz * 0.55, 0.45, r), o = ML.rng(sd + 1).shuffle(Array.from({ length: N }, (_, i) => i)); return { X: o.map((i) => d0.X[i]), y: o.map((i) => (d0.y[i] ? 1 : -1)) }; };
  function* steps(mod, k, nz, sd) {
    const a = pool(k, nz, 900 + sd, 3000), b = pool(k, nz, 901 + sd, 1500), pr = ML.knnPredict(a.X, a.y, b.X, { k: 25, weights: 'uniform', p: 2 }); let ok = 0; for (let i = 0; i < pr.length; i++) if (pr[i] === (b.y[i] > 0 ? 1 : 0)) ok++; ceiling = ok / pr.length; yield 0.02;
    const dd = pool(k, nz, sd, NP), sp = ML.stratKFold(dd.y, 5, ML.rng(sd + 2)); curve = [];
    for (let q = 0; q < SIZES.length; q++) {
      const s = SIZES[q], tr = [], te = [];
      for (const f of sp) { const idx = f.train.slice(0, s), fit = MODELS[mod].fit(idx.map((i) => dd.X[i]), idx.map((i) => dd.y[i])); tr.push(ML.mean(idx.map((i) => (fit(dd.X[i]) === dd.y[i] ? 1 : 0)))); te.push(ML.mean(f.test.map((i) => (fit(dd.X[i]) === dd.y[i] ? 1 : 0)))); }
      curve.push({ s, tr: ML.mean(tr), trSd: ML.std(tr), te: ML.mean(te), teSd: ML.std(te) }); yield 0.02 + 0.98 * (q + 1) / SIZES.length;
    }
  }
  function run() { if (job) job.stop(); curve = []; ceiling = null; mnote.textContent = MODELS[model].label; job = EVU.job(steps(model, kind, noise, seed), { progress: pg, frame: refresh, done: refresh }); refresh(); }
  function refresh() {
    P.plot.redraw(); const done = curve.length === SIZES.length;
    if (!done) { ['tr', 'cv', 'gap', 'rise'].forEach((k) => R.set(k, '…')); R.set('ceil', ceiling ? EVU.pc(ceiling, 0) : '…'); dx.textContent = 'Computing the curves…'; return; }
    const L = curve[curve.length - 1], q = curve.length, gap = L.tr - L.te, rise = (curve[q - 1].te + curve[q - 2].te) / 2 - (curve[q - 3].te + curve[q - 4].te) / 2;
    R.set('tr', EVU.pc(L.tr, 1)); R.set('cv', EVU.pc(L.te, 1) + ' ± ' + (100 * L.teSd).toFixed(1)); R.set('gap', (100 * gap).toFixed(1) + ' points', gap > 0.06 ? 'bad' : 'good'); R.set('ceil', EVU.pc(ceiling, 0)); R.set('rise', (rise >= 0 ? '+' : '') + (100 * rise).toFixed(1) + ' points');
    if (L.tr < ceiling - 0.04) dx.innerHTML = '<b>Both low.</b> Even the training score is well below what this data allows' + (gap < 0.06 ? ', and it is close to the validation score' : '') + ': the model is too simple. More data will not help. <b>Use a richer model or better features.</b>';
    else if (gap >= 0.06) dx.innerHTML = '<b>Big gap: the model memorises.</b> ' + (rise >= 0.015 ? 'The validation curve is still rising as the data grows, so <b>more data should help</b> (so would a simpler model).' : 'The validation curve has almost flattened, so <b>more data alone will not close the gap</b>: simplify or regularise the model.');
    else dx.innerHTML = '<b>Both high and close.</b> Training and validation agree and sit near what this data allows. More data or a bigger model will not change much: you are done.';
  }
  const X = (s) => Math.log10(s);
  P.plot.draw = (p) => {
    const col = p.col; const lo = curve.length ? Math.max(0.3, Math.floor((Math.min(...curve.map((q) => Math.min(q.te - q.teSd, q.tr - q.trSd))) - 0.04) * 20) / 20) : 0.5; p.setLims(null, [lo, 1.02]); p._layout();
    p.axes({ xlabel: 'training rows used (log scale)', ylabel: 'accuracy', xticks: [20, 50, 100, 200, 500].map(X), xfmt: (v) => String(Math.round(Math.pow(10, v))), yfmt: (v) => Math.round(v * 100) + '%' });
    if (ceiling) { p.seg(X(16), ceiling, X(560), ceiling, { color: col.muted, w: 2, dash: [2, 5] }); p.text(X(18), ceiling, 'about the best possible', { color: col.ink2, size: 11.5, weight: 600, dy: -9, halo: true }); }
    if (!curve.length) return;
    const band = (k, sd, c2) => p.poly(curve.map((q) => [X(q.s), Math.min(1.02, q[k] + q[sd])]).concat(curve.map((q) => [X(q.s), q[k] - q[sd]]).reverse()), { fill: c2, alpha: 0.14 });
    band('tr', 'trSd', col.c[1]); band('te', 'teSd', col.c[0]);
    p.line(curve.map((q) => [X(q.s), q.tr]), { color: col.c[1], w: 2.8, dash: [8, 5] }); p.line(curve.map((q) => [X(q.s), q.te]), { color: col.c[0], w: 3.2 });
    curve.forEach((q) => { p.dot(X(q.s), q.te, { fill: col.c[0], r: 3.8, lw: 1 }); p.dot(X(q.s), q.tr, { fill: col.c[1], r: 3.4, shape: 'square', lw: 1 }); });
    p.setLabel('Learning curve for the ' + model + ' model' + (curve.length === SIZES.length ? ': at 480 rows training ' + EVU.pc(curve[curve.length - 1].tr, 0) + ', validation ' + EVU.pc(curve[curve.length - 1].te, 0) : ''));
  };
  P.plot.on('hover', (e) => { if (!curve.length) return UI.tip.hide(); const q = curve.reduce((a, b) => (Math.abs(X(b.s) - e.x) < Math.abs(X(a.s) - e.x) ? b : a)); if (Math.abs(X(q.s) - e.x) > 0.12) return UI.tip.hide(); UI.tip.show('<b>' + q.s + ' rows</b><br>training ' + EVU.pc(q.tr, 1) + '<br>validation ' + EVU.pc(q.te, 1) + ' ± ' + (100 * q.teSd).toFixed(1), e.cx, e.cy); });
  run();
})();
