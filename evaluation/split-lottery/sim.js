/* One test set is one draw of the lottery: the same data and model scored by 200 hold-out splits, by 5-fold CV and by repeated 5-fold CV. */
(function () {
  'use strict';
  const { stage, side } = UI.shell('evaluation/split-lottery');
  const h = UI.h, NH = 200, NK = 100, NR = 100, REPS = 5;
  let n = 100, frac = 0.2, seed = 1, data = null, truth = null, res = { hold: [], k5: [], rep: [] }, job = null, gen = 0;

  UI.predict(side, { title: 'Predict first', q: 'Same data, same model, <b>200 different random 80/20 splits</b>. Each split trains on 80 points and scores the other 20. How far apart are the best and the worst test accuracy?', options: ['Identical', 'Within 1 point', 'About 5 points', '10 points or more'], answer: 3,
    reveal: '<b>10 points or more.</b> Twenty test points means one wrong answer moves the score by 5 points, and which 20 points you drew decides how many are hard. With the default data the best split scores 100% and the worst 60%. Press <i>Run</i> below to see the whole picture, then compare with 5-fold cross-validation.' });

  const c = UI.panel(side, 'Data and splits');
  UI.slider(c, { label: 'Number of points, n', min: 40, max: 300, step: 10, value: n, fmt: (v) => String(Math.round(v)), onInput: UI.debounce((v) => { n = Math.round(v); build(); }, 250) });
  UI.slider(c, { label: 'Test fraction of the hold-out split', min: 0.1, max: 0.5, step: 0.05, value: frac, fmt: (v) => Math.round(v * 100) + '%', help: '5-fold CV always tests on one fifth (20%).', onInput: UI.debounce((v) => { frac = v; holdOnly(); }, 250) });
  UI.buttons(c, [{ label: 'New data', primary: true, onClick() { seed++; build(); } }, { label: 'Draw the splits again', onClick() { run(false); } }]);
  UI.note(c, 'The model is always logistic regression. Only the data and the way we score it change.');
  const pg = UI.progress(c);

  const D = UI.plotCard(stage, 'The data and the model fitted to all of it', { xlim: [-3.6, 3.6], ylim: [-3, 3], aspect: 1.9, equal: true, margin: { l: 34, r: 10, t: 10, b: 30 }, label: 'Two overlapping classes with a logistic regression line' }, 'Two overlapping groups. No line can be perfect, so some points are always on the wrong side.');
  UI.legend(D.card, [{ label: 'class A', color: UI.colors().c[0], shape: 'circle' }, { label: 'class B', color: UI.colors().c[1], shape: 'triangle' }, { label: 'fitted line', color: UI.colors().ink, shape: 'line' }]);
  const NAMES = [['hold', 'One hold-out split (200 splits)', 'One hold-out split'], ['k5', '5-fold cross-validation (100 reshuffles)', '5-fold cross-validation'], ['rep', '5-fold repeated 5 times (100 runs)', '5-fold, repeated 5 times']];
  const H = {}; NAMES.forEach(([id, t]) => { H[id] = UI.plotCard(stage, t, { xlim: [0.5, 1], ylim: [0, 40], aspect: 3.4, margin: { l: 44, r: 22, t: 12, b: 38 }, label: 'Histogram of accuracy estimates: ' + t }); });
  UI.legend(H.rep.card, [{ label: 'mean of the estimates', color: UI.colors().ink, shape: 'line' }, { label: 'accuracy of the line on 20,000 fresh points', color: UI.colors().c[1], shape: 'dash' }]);
  const T = EVU.card(stage, 'The numbers behind the pictures'); const tab = EVU.table(T, ['How it is scored', 'mean', 'sd', 'lowest', 'highest', 'range'], [[], [], []].map(() => ['', '', '', '', '', '']));
  const note = UI.note(T, '', 'callout');

  const yy = (y) => y.map((v) => (v ? 1 : -1));
  function fitAcc(tr, te) { const m = ML.logreg(tr.map((i) => data.X[i]), yy(tr.map((i) => data.y[i])), { C: 1 }); let c2 = 0; for (const i of te) if ((m.decision(data.X[i]) > 0) === (data.y[i] > 0)) c2++; return c2 / te.length; }
  function build() {
    data = ML.twoClasses(n, ML.rng(seed * 31 + n)); const all = data.X.map((_, i) => i), m = ML.logreg(data.X, yy(data.y), { C: 1 }), big = ML.twoClasses(20000, ML.rng(999));
    let ok = 0; for (let i = 0; i < big.X.length; i++) if ((m.decision(big.X[i]) > 0) === (big.y[i] > 0)) ok++; truth = { acc: ok / big.X.length, model: m };
    run(false);
  }
  function holdOnly() { if (job) job.stop(); if (res.k5.length === NK && res.rep.length === NR) { res.hold = []; run(true); } else run(false); }
  function* steps(only, rngSeed) {
    const r = ML.rng(rngSeed), total = only ? NH : NH + NK + NR;
    for (let i = 0; i < NH; i++) { const s = ML.holdout(n, frac, r); res.hold.push(fitAcc(s.train, s.test)); if (i % 10 === 9) yield (i + 1) / total; }
    if (only) return;
    for (let i = 0; i < NK; i++) { res.k5.push(ML.mean(ML.kFold(n, 5, r).map((s) => fitAcc(s.train, s.test)))); if (i % 4 === 3) yield (NH + i + 1) / total; }
    for (let i = 0; i < NR; i++) { const a = []; for (let q = 0; q < REPS; q++) ML.kFold(n, 5, r).forEach((s) => a.push(fitAcc(s.train, s.test))); res.rep.push(ML.mean(a)); yield (NH + NK + i + 1) / total; }
  }
  function run(onlyHold) {
    if (job) job.stop(); if (!onlyHold) res = { hold: [], k5: [], rep: [] };
    job = EVU.job(steps(!!onlyHold, seed * 1000 + (++gen)), { progress: pg, frame: refresh });
  }
  const f1 = (v) => (100 * v).toFixed(1);
  function refresh() {
    tab.set(NAMES.map(([id, , lab]) => { const v = res[id]; if (!v.length) return [lab, '–', '–', '–', '–', '–']; const s = ML.stats(v); return [lab, f1(s.mean) + '%', f1(s.sd) + ' pts', f1(s.min) + '%', f1(s.max) + '%', { text: f1(s.max - s.min) + ' pts', cls: id === 'hold' ? 'bad' : '' }]; }));
    const s = ML.stats(res.hold), s5 = ML.stats(res.k5);
    note.innerHTML = res.hold.length ? 'Fitted on all <b>' + n + '</b> points, the line scores <b>' + f1(truth.acc) + '%</b> on 20,000 fresh points (orange dashes). The hold-out numbers swing from <b>' + f1(s.min) + '%</b> to <b>' + f1(s.max) + '%</b> around it' + (res.k5.length ? '; the 5-fold numbers stay within <b>' + f1(s5.max - s5.min) + ' points</b> of each other.' : '.') : '';
    NAMES.forEach(([id]) => H[id].plot.redraw()); D.plot.redraw();
  }
  NAMES.forEach(([id]) => {
    H[id].plot.draw = (p) => {
      const col = p.col, v = res[id]; const mx = Math.max(10, ...EVU.bin(v, 0.5, 1, 0.02), 1); const top = Math.ceil(mx / 5) * 5 + 5; p.setLims(null, [0, top]); p._layout();
      p.axes({ xlabel: 'accuracy estimate', ylabel: 'number of runs', xticks: [0.5, 0.6, 0.7, 0.8, 0.9, 1], xfmt: (x) => Math.round(x * 100) + '%', yticks: ML.niceTicks(0, top, 3) });
      if (truth) p.seg(truth.acc, 0, truth.acc, top, { color: col.c[1], w: 2.4, dash: [6, 4] });
      if (!v.length) return; EVU.hist(p, v, { lo: 0.5, hi: 1, w: 0.02, color: col.c[0] });
      const m = ML.mean(v); p.seg(m, 0, m, top, { color: col.ink, w: 2.4 });
      p.setLabel(NAMES.find((q) => q[0] === id)[1] + ': mean ' + f1(m) + '%, lowest ' + f1(Math.min(...v)) + '%, highest ' + f1(Math.max(...v)) + '%');
    };
  });
  D.plot.draw = (p) => {
    const col = p.col; p.axes({ zero: true, xfmt: (v) => +v.toFixed(1) + '', yfmt: (v) => +v.toFixed(1) + '' }); if (!data) return;
    if (truth) p.abline(truth.model.w[0], truth.model.w[1], truth.model.b, { color: col.ink, w: 2.6 });
    data.X.forEach((q, i) => { const st = UI.cls(data.y[i]); p.dot(q[0], q[1], { fill: st.color, shape: st.shape, r: 4.4, lw: 1.4 }); });
  };
  build();
})();
