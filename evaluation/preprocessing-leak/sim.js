/* Noise can score 90%: picking features on all the rows before cross-validation leaks the labels into the test folds. */
(function () {
  'use strict';
  const { stage, side } = UI.shell('evaluation/preprocessing-leak');
  const h = UI.h, REPS = 30;
  let n = 200, p = 5000, k = 20, seed = 1, wrong = [], right = [], job = null, gen = 0;

  UI.predict(side, { title: 'Predict first', q: 'The labels are <b>coin flips</b> and all <b>5,000 features are pure noise</b>, for 200 rows. You keep the 20 features that best match the labels, using all the rows, and then run 5-fold cross-validation with a simple classifier. What accuracy do you expect?', options: ['About 50%', 'About 55%', '75% to 90%', 'Cannot tell'], answer: 2,
    reveal: '<b>75% to 90%.</b> With 5,000 noise columns, some of them match 200 coin flips by chance, and picking them on all rows lets the test rows vote on which columns to keep. The classifier then “generalises” to rows that helped choose its features. The page below runs it 30 times: on the default settings the wrong way scores about 81% on average (76% to 86%), the right way about 50%.' });

  const c = UI.panel(side, 'Data');
  UI.slider(c, { label: 'Rows, n', min: 30, max: 300, step: 10, value: n, fmt: (v) => String(Math.round(v)), onInput: UI.debounce((v) => { n = Math.round(v); run(); }, 250) });
  UI.slider(c, { label: 'Noise features, p', min: 10, max: 5000, log: true, value: p, fmt: (v) => String(Math.round(v)), onInput: UI.debounce((v) => { p = Math.round(v); run(); }, 250) });
  UI.slider(c, { label: 'Features kept, k', min: 1, max: 50, step: 1, value: k, fmt: (v) => String(Math.round(v)), onInput: UI.debounce((v) => { k = Math.round(v); run(); }, 250) });
  UI.buttons(c, [{ label: 'Run again', primary: true, onClick() { seed++; run(); } }]);
  UI.note(c, 'Each run draws fresh noise, selects the k columns with the largest F statistic (the same ranking as scikit-learn\'s f_classif), and scores a nearest-centroid classifier by 5-fold cross-validation. ' + REPS + ' runs per setting.');
  const pg = UI.progress(c);
  const rd = UI.panel(side, 'Readouts'), R = UI.read(rd, [{ id: 'w', label: 'Wrong way: mean accuracy' }, { id: 'wr', label: 'Wrong way: lowest to highest' }, { id: 'r', label: 'Right way: mean accuracy' }, { id: 'rr', label: 'Right way: lowest to highest' }, { id: 'truth', label: 'What coin flips allow' }]);

  const P = UI.plotCard(stage, 'Cross-validated accuracy on pure noise, ' + REPS + ' runs each', { xlim: [0.4, 2.6], ylim: [0.3, 1], aspect: 1.75, margin: { l: 50, r: 14, t: 12, b: 44 }, hover: true, label: 'Accuracy of the wrong and right procedures over repeated runs' }, 'Each dot is one run with fresh noise. The bar is the mean. The dashed line is 50%, what an honest score on coin flips should be.');
  const fl = EVU.card(stage, 'The two procedures');
  fl.append(h('ul', { class: 'note', style: { margin: '0 0 8px', paddingLeft: '20px' }, html: '<li><b>Wrong:</b> pick the k best columns using <b>all</b> the rows and labels \u2192 split into 5 folds \u2192 fit on four folds, score on the fifth.</li><li><b>Right:</b> split into 5 folds \u2192 in each fold pick the k best columns using <b>only the training part</b> \u2192 fit on it, score on the held-out fold. (This is what a Pipeline does.)</li>' }));
  UI.note(fl, 'The only difference is <i>when</i> the labels are used to choose columns. Nothing is wrong with the classifier or the folds.');

  function* steps(my, nn, pp, kk, sd) {
    const rng = ML.rng(sd), kq = Math.min(kk, pp);
    for (let r = 0; r < REPS; r++) {
      const d = ML.noiseData(nn, pp, rng), X = d.X, y = d.y, folds = ML.stratKFold(y, 5, rng), colsAll = ML.topK(ML.fClassif(X, y), kq); let w = 0, rt = 0;
      for (const f of folds) {
        const m1 = ML.nearestCentroid(X, y, f.train, colsAll); for (const i of f.test) if (m1.predict(X[i]) === y[i]) w++;
        const cols = ML.topK(ML.fClassif(X, y, f.train), kq), m2 = ML.nearestCentroid(X, y, f.train, cols); for (const i of f.test) if (m2.predict(X[i]) === y[i]) rt++;
      }
      wrong.push(w / nn); right.push(rt / nn); yield (r + 1) / REPS;
    }
  }
  function run() { if (job) job.stop(); wrong = []; right = []; job = EVU.job(steps(++gen, n, p, k, seed * 1009 + 17), { progress: pg, frame: refresh }); refresh(); }
  function refresh() {
    const f = (v) => (100 * v).toFixed(1) + '%', set = (a, m, r2) => { if (!a.length) { R.set(m, '–'); R.set(r2, '–'); return; } const s = ML.stats(a); R.set(m, f(s.mean), m === 'w' && s.mean > 0.6 ? 'bad' : 'good'); R.set(r2, Math.round(100 * s.min) + '% to ' + Math.round(100 * s.max) + '%'); };
    set(wrong, 'w', 'wr'); set(right, 'r', 'rr'); R.set('truth', '50% (a coin flip)'); P.plot.redraw();
  }
  P.plot.draw = (pl) => {
    const col = pl.col; pl.axes({ xticks: [1, 2], xfmt: (v) => (v === 1 ? 'Wrong: select first' : 'Right: select in each fold'), yticks: [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1], yfmt: (v) => Math.round(v * 100) + '%', ylabel: 'accuracy' });
    pl.seg(0.4, 0.5, 2.6, 0.5, { color: col.muted, w: 1.8, dash: [6, 5] });
    [[1, wrong, col.c[1], 'triangle'], [2, right, col.c[0], 'circle']].forEach(([x, a, c2, sh]) => {
      if (!a.length) return; EVU.strip(pl, x, a, { color: c2, shape: sh, r: 4.2, width: 0.7, seed: x * 5 }); const m = ML.mean(a);
      pl.seg(x - 0.38, m, x + 0.38, m, { color: col.ink, w: 3 }); pl.text(x + 0.4, m, Math.round(m * 100) + '%', { weight: 700, color: col.ink, halo: true, size: 13 });
    });
    pl.setLabel('Wrong way mean ' + (wrong.length ? Math.round(100 * ML.mean(wrong)) : '?') + '%, right way mean ' + (right.length ? Math.round(100 * ML.mean(right)) : '?') + '%');
  };
  P.plot.on('hover', (e) => { const a = e.x < 1.5 ? wrong : right; if (!a.length) return UI.tip.hide(); const s = ML.stats(a); UI.tip.show('<b>' + (e.x < 1.5 ? 'Wrong' : 'Right') + '</b><br>mean ' + (100 * s.mean).toFixed(1) + '%<br>sd ' + (100 * s.sd).toFixed(1) + ' points<br>' + a.length + ' runs', e.cx, e.cy); });
  run();
})();
