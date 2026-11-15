/* Random folds against the real world: customers with several rows each, and a relationship that drifts over time. */
(function () {
  'use strict';
  const { stage, side } = UI.shell('evaluation/random-vs-real');
  const h = UI.h, NT = 600;
  let scen = 'customers', G = 40, R = 8, drift = 270, seed = 1, res = null, data = null;

  const c = UI.panel(side, 'Which story?');
  UI.seg(c, { label: 'Scenario', options: [{ value: 'customers', label: 'Customers' }, { value: 'drift', label: 'Drift over time' }], value: scen, onChange(v) { scen = v; setScen(); } });
  const pc = UI.panel(side, 'Customers'), pd = UI.panel(side, 'Drift');
  UI.slider(pc, { label: 'Number of customers', min: 10, max: 100, step: 5, value: G, fmt: (v) => String(Math.round(v)), onInput: UI.debounce((v) => { G = Math.round(v); run(); }, 200) });
  UI.slider(pc, { label: 'Rows per customer', min: 2, max: 20, step: 1, value: R, fmt: (v) => String(Math.round(v)), onInput: UI.debounce((v) => { R = Math.round(v); run(); }, 200) });
  UI.note(pc, 'Each customer has one label (say, will leave or not). In this made-up data the label has <b>nothing</b> to do with the features, so an honest model can only guess. The model is 1-nearest-neighbour: it copies the label of the closest row it has seen.');
  UI.slider(pd, { label: 'Drift: how far the boundary turns over the history', min: 0, max: 360, step: 15, value: drift, fmt: (v) => Math.round(v) + '°', onInput: UI.debounce((v) => { drift = v; run(); }, 200) });
  UI.note(pd, 'The label depends on two features, but the rule that links them rotates as weeks go by. The model sees the two features and the week number, and copies the 5 closest rows (5-nearest-neighbours).');
  UI.buttons(side, [{ label: 'New data', primary: true, onClick() { seed++; run(); } }]);
  const rd = UI.panel(side, 'Accuracy'), R0 = UI.read(rd, [{ id: 'rnd', label: 'Random 5-fold says' }, { id: 'hon', label: 'Honest folds say' }, { id: 'real', label: 'You really get' }, { id: 'gap', label: 'Random folds overstate by' }]);

  const A = UI.plotCard(stage, 'The data', { xlim: [-3, 3], ylim: [-3, 3], aspect: 1.9, margin: { l: 38, r: 12, t: 12, b: 36 }, hover: false, label: 'Explanatory plot' }, ' ');
  const B = UI.plotCard(stage, 'What each way of scoring reports', { xlim: [0.3, 1], ylim: [0, 3], aspect: 2.5, aspectFn: (w) => (w < 520 ? 1.7 : 2.5), margin: { l: 118, r: 24, t: 10, b: 38 }, label: 'Accuracy estimates from random folds, honest folds and fresh data' }, ' ');
  UI.legend(B.card, [{ label: 'one fold', color: UI.colors().c[0], shape: 'circle' }, { label: 'mean', color: UI.colors().ink, shape: 'line' }, { label: 'chance (50%)', color: UI.colors().muted, shape: 'dash' }]);
  const note = UI.note(B.card, '', 'callout');

  const accOf = (pred, y) => { let k = 0; for (let i = 0; i < y.length; i++) if (pred[i] === (y[i] > 0 ? 1 : 0)) k++; return k / y.length; };
  const foldAcc = (X, y, splits, cfg) => splits.map((s) => accOf(ML.knnPredict(s.train.map((i) => X[i]), s.train.map((i) => y[i]), s.test.map((i) => X[i]), cfg), s.test.map((i) => y[i])));
  function setScen() { pc.style.display = scen === 'customers' ? '' : 'none'; pd.style.display = scen === 'drift' ? '' : 'none'; run(); }
  function run() {
    const r = ML.rng(seed * 977 + (scen === 'customers' ? G * 31 + R : drift));
    if (scen === 'customers') {
      const d = ML.customers(G, R, 0, r), n = d.X.length, cfg = { k: 1, weights: 'uniform', p: 2 }, fresh = ML.customers(300, 3, 0, ML.rng(seed + 4242));
      const rnd = foldAcc(d.X, d.y, ML.kFold(n, 5, r), cfg), grp = foldAcc(d.X, d.y, ML.groupKFold(d.group, 5), cfg), real = accOf(ML.knnPredict(d.X, d.y, fresh.X, cfg), fresh.y);
      data = d; res = { rnd, hon: grp, real, labels: ['Random folds', 'Group folds', 'New customers'] };
    } else {
      const phi = drift * Math.PI / 180, d = ML.driftData(NT, phi, 0, 1, r), sc = (x) => [x[0], x[1], x[2] * 3], X = d.X.map(sc), cfg = { k: 5, weights: 'uniform', p: 2 };
      const fut = ML.driftData(2000, phi, 1, 1 + 1 / 6, ML.rng(seed + 777)), rnd = foldAcc(X, d.y, ML.kFold(NT, 5, r), cfg), fwd = foldAcc(X, d.y, ML.timeSeriesSplit(NT, 5), cfg), real = accOf(ML.knnPredict(X, d.y, fut.X.map(sc), cfg), fut.y);
      data = d; res = { rnd, hon: fwd, real, labels: ['Random folds', 'Forward chaining', 'Real future block'] };
    }
    refresh();
  }
  function refresh() {
    const mr = ML.mean(res.rnd), mh = ML.mean(res.hon), cust = scen === 'customers';
    R0.set('rnd', EVU.pc(mr, 1)); R0.set('hon', EVU.pc(mh, 1)); R0.set('real', EVU.pc(res.real, 1), 'good'); R0.set('gap', ((mr - res.real) * 100).toFixed(1) + ' points', mr - res.real > 0.05 ? 'bad' : '');
    A.card.querySelector('h3').textContent = cust ? 'The rows: each customer is a tight cluster' : 'How the true boundary turns as weeks pass';
    A.cap.innerHTML = cust ? 'Features 1 and 2 of ' + data.X.length + ' rows from ' + G + ' customers. Neighbours of a row are almost always rows of the <i>same</i> customer.' : 'The history covers weeks 0 to 1 (scaled). The model will be used on the block just after it. The dashed line is where each forward-chaining test block sits.';
    B.cap.innerHTML = cust ? 'Random folds put a customer\'s rows on both sides, so the test row finds its own customer in training. Group folds and new customers show what happens for someone the model has never seen.' : 'Random folds test on weeks that have neighbours on both sides in time. Forward chaining trains on the past and tests on the next block, which is how the model will be used.';
    note.innerHTML = cust ? 'Random folds say <b>' + EVU.pc(mr, 0) + '</b>, group folds say <b>' + EVU.pc(mh, 0) + '</b>, and new customers get <b>' + EVU.pc(res.real, 0) + '</b>.' : 'Random folds say <b>' + EVU.pc(mr, 0) + '</b>, forward chaining says <b>' + EVU.pc(mh, 0) + '</b>, and the real next block gets <b>' + EVU.pc(res.real, 0) + '</b>.';
    A.plot.redraw(); B.plot.redraw();
  }
  A.plot.draw = (p) => {
    const col = p.col; if (!data) return;
    if (scen === 'customers') {
      p.setLims([-3, 3], [-3, 3]); p._layout(); p.axes({ zero: true, xlabel: 'feature 1', ylabel: 'feature 2', xfmt: (v) => +v.toFixed(1) + '', yfmt: (v) => +v.toFixed(1) + '' });
      data.X.forEach((q, i) => { const st = UI.cls(data.y[i]); p.dot(q[0], q[1], { fill: st.color, shape: st.shape, r: 3.6, alpha: 0.85, lw: 0.8 }); });
      p.setLabel('Rows of ' + G + ' customers in two features; each customer forms a tight cluster with one label');
    } else {
      p.setLims([0, 1.2], [0, drift * 1.17 + 20]); p._layout(); p.axes({ xlabel: 'time (history ends at 1)', ylabel: 'angle of the boundary (degrees)', xticks: [0, 0.2, 0.4, 0.6, 0.8, 1, 1.2], yfmt: (v) => Math.round(v) + '°' });
      p.rect(1, p.vy[0], 1.2, p.vy[1], { fill: col.c[1], alpha: 0.12 }); p.text(1.1, p.vy[1], 'future', { align: 'center', base: 'top', dy: 12, color: col.ink2, weight: 700, size: 12 });
      p.text(0.5, p.vy[1], 'history the model learns from', { align: 'center', base: 'top', dy: 12, color: col.ink2, weight: 700, size: 12 });
      p.line([[0, 0], [1.1667, drift * 1.1667]], { color: col.c[0], w: 3 });
      for (let b = 1; b <= 5; b++) { const x = b / 6; p.seg(x, p.vy[0], x, p.vy[1], { color: col.muted, w: 1, dash: [3, 4] }); }
      p.setLabel('The angle of the true boundary rises from 0 to ' + Math.round(drift) + ' degrees over the history and keeps turning into the future');
    }
  };
  B.plot.draw = (p) => {
    const col = p.col; if (!res) return; p.axes({ grid: true, xlabel: 'accuracy', xticks: p.pw < 330 ? [0.4, 0.6, 0.8, 1] : [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1], xfmt: (v) => Math.round(v * 100) + '%', yticks: [], ylabel: '' });
    p.seg(0.5, 0, 0.5, 3, { color: col.muted, w: 1.6, dash: [5, 5] });
    const vals = [{ y: 2.5, mean: ML.mean(res.rnd), pts: res.rnd, color: col.c[0] }, { y: 1.5, mean: ML.mean(res.hon), pts: res.hon, color: col.c[0] }, { y: 0.5, mean: res.real, pts: null, color: col.c[2] }];
    vals.forEach((v, i) => {
      p.text(8, p.Y(v.y), res.labels[i], { px: true, weight: 700, size: 12.5, color: col.ink });
      p.poly([[0.3, v.y - 0.28], [v.mean, v.y - 0.28], [v.mean, v.y + 0.28], [0.3, v.y + 0.28]], { fill: v.color, alpha: i === 2 ? 0.55 : 0.28, stroke: v.color, w: 1.6 });
      if (v.pts) v.pts.forEach((a, k) => p.dot(a, v.y + (k - 2) * 0.08, { fill: v.color, r: 3.6, lw: 1, alpha: 0.95 }));
      p.seg(v.mean, v.y - 0.34, v.mean, v.y + 0.34, { color: col.ink, w: 2.6 });
      p.text(Math.min(0.97, v.mean + 0.015), v.y + 0.34, EVU.pc(v.mean, 0), { weight: 700, size: 13, color: col.ink, halo: true, align: v.mean > 0.9 ? 'right' : 'left', dx: v.mean > 0.9 ? -4 : 4 });
    });
    p.setLabel(res.labels.map((l, i) => l + ' ' + EVU.pc(i === 2 ? res.real : ML.mean(i ? res.hon : res.rnd), 0)).join(', '));
  };
  setScen();
})();
