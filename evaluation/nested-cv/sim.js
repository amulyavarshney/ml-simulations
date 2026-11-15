/* The best score you picked is not the score you will get: winner's curse, nested CV and the truth, over many simulated datasets. */
(function () {
  'use strict';
  const { stage, side } = UI.shell('evaluation/nested-cv');
  const h = UI.h, MMAX = 60, NDS = 40, D = 4;
  let n = 80, signal = 1.5, m = 50, seed = 1, res = null, job = null, gen = 0;
  const CFG0 = []; for (let k = 1; k <= 29; k += 2) for (const w of ['uniform', 'distance']) for (const p of [2, 1]) CFG0.push({ k, weights: w, p });
  const CFG = ML.rng(77).shuffle(CFG0.map((_, i) => i)).map((i) => CFG0[i]);
  const word = (s) => (s === 0 ? 'none' : s <= 0.5 ? 'weak' : s <= 1 ? 'medium' : 'strong');

  UI.predict(side, { title: 'Predict first', q: 'You try <b>50 settings</b> of a model with 5-fold cross-validation and report the best score, <b>0.88</b>. You then run <b>nested</b> cross-validation on the same data, tuning inside each training set. What does it say?', options: ['About 0.88', 'A little lower (under 1 point)', 'Lower by several points', 'Higher'], answer: 2,
    reveal: '<b>Lower by several points.</b> The best of 50 scores is partly luck: the winner is the setting whose score was pushed up by chance. Nested cross-validation repeats the whole choosing process on training data only, so it is not flattered by the choice. On the default data below, the best of 50 averages about 88%, the nested estimate about 84% and the truth (fresh data) about 84%.' });
  const c = UI.panel(side, 'Settings and data');
  UI.slider(c, { label: 'Settings tried, m', min: 1, max: MMAX, step: 1, value: m, fmt: (v) => String(Math.round(v)), help: 'Choices of k (1 to 29), vote weighting and distance for a nearest-neighbour model: 60 in all, in a fixed random order.', onInput(v) { m = Math.round(v); refresh(); } });
  UI.slider(c, { label: 'Rows in each dataset, n', min: 40, max: 200, step: 10, value: n, fmt: (v) => String(Math.round(v)), onInput: UI.debounce((v) => { n = Math.round(v); run(); }, 300) });
  UI.slider(c, { label: 'Signal strength', min: 0, max: 2, step: 0.25, value: signal, fmt: (v) => v.toFixed(2) + ' (' + word(v) + ')', help: 'How far apart the two classes sit along two of the four features. With none, the labels are coin flips.', onInput: UI.debounce((v) => { signal = v; run(); }, 300) });
  UI.buttons(c, [{ label: 'New datasets', primary: true, onClick() { seed++; run(); } }]);
  UI.note(c, NDS + ' simulated datasets per setting. For each one: the best 5-fold CV score among the m settings, the nested estimate, and the truth, measured on 1,500 fresh rows from the same generator.');
  const pg = UI.progress(c);
  const rd = UI.panel(side, 'At m settings (average over the datasets)'), R = UI.read(rd, [{ id: 'best', label: 'Best CV score (what people report)' }, { id: 'nest', label: 'Nested CV estimate' }, { id: 'truth', label: 'Truth on fresh data' }, { id: 'g1', label: 'Best CV minus truth' }, { id: 'g2', label: 'Nested minus truth' }]);

  const dg = EVU.card(stage, 'Nested cross-validation in one picture');
  const tx = (x, y, t, bold) => '<text x="' + x + '" y="' + y + '" style="fill:var(' + (bold ? '--ink' : '--ink2') + ');' + (bold ? 'font-weight:700' : '') + '">' + t + '</text>';
  const bx = (x, y, w, fill, op) => '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="36" rx="5" style="fill:var(' + fill + ');opacity:' + op + '"/>';
  dg.append(h('div', { html: '<svg viewBox="0 0 640 318" role="img" aria-label="Nested cross-validation: five outer folds judge the whole procedure; inside each outer training set three inner folds choose the setting" style="width:100%;height:auto;font:19px var(--font)">'
    + tx(0, 22, 'Outer loop, 5 folds: judges the whole procedure', true)
    + [0, 1, 2, 3, 4].map((i) => bx(i * 124 + 2, 34, 116, i === 4 ? '--c2' : '--c1', i === 4 ? 1 : 0.5)).join('') + tx(12, 59, 'train', true) + tx(512, 59, 'test', true)
    + '<path d="M300 74 L300 98" style="stroke:var(--axis);stroke-width:2.5;fill:none"/><path d="M293 90 L300 100 L307 90" style="stroke:var(--axis);stroke-width:2.5;fill:none"/>'
    + tx(0, 124, 'Inner loop, 3 folds, on the outer training part only:', true) + tx(0, 148, 'choose the setting', true)
    + [0, 1, 2].map((i) => bx(i * 160 + 2, 160, 152, i === 2 ? '--c3' : '--c1', i === 2 ? 1 : 0.5)).join('') + tx(10, 185, 'fit settings', true) + tx(330, 185, 'score settings', true)
    + tx(0, 232, 'The winning setting is refitted on the whole outer training', false) + tx(0, 256, 'part, then scored once on the outer test fold.', false)
    + tx(0, 288, 'That score took no part in the choice, so it is not flattered.', false) + tx(0, 312, 'The five outer scores are averaged.', false) + '</svg>' }));

  const L = UI.plotCard(stage, 'Average score against the number of settings tried', { xlim: [1, MMAX], ylim: [0.4, 1], aspect: 1.9, margin: { l: 52, r: 14, t: 12, b: 42 }, hover: true, label: 'Average best CV score, nested CV estimate and truth against the number of settings tried' }, ' ');
  UI.legend(L.card, [{ label: 'best CV score (reported)', color: UI.colors().c[1], shape: 'line' }, { label: 'nested CV estimate', color: UI.colors().c[0], shape: 'dash' }, { label: 'truth on fresh data', color: UI.colors().c[2], shape: 'line' }]);
  const S = UI.plotCard(stage, 'One dot per dataset', { xlim: [0.4, 3.6], ylim: [0.4, 1], aspect: 2.2, margin: { l: 52, r: 14, t: 12, b: 42 }, hover: true, label: 'One dot per simulated dataset: best CV score, nested estimate and truth' }, ' ');
  const sn = UI.note(S.card, '', 'callout');

  function* job1(my, nn, sg, sd) {
    const fresh = ML.signalData(1500, D, sg, ML.rng(5555 + sd)), best = Array.from({ length: MMAX + 1 }, () => []), nest = Array.from({ length: MMAX + 1 }, () => []), truth = Array.from({ length: MMAX + 1 }, () => []);
    for (let s = 0; s < NDS; s++) {
      const rng = ML.rng(sd * 100003 + s * 7 + 1), d = ML.signalData(nn, D, sg, rng), gr = ML.knnGrid(d.X, d.y, CFG), outer = ML.stratKFold(d.y, 5, rng);
      const T = ML.nestedTables(gr.scoreAll, outer, (tr) => ML.subSplits(tr, ML.stratKFold(tr.map((i) => d.y[i]), 3, rng))), cache = {};
      for (let mm = 1; mm <= MMAX; mm++) {
        const pk = ML.nestedPick(T, mm); if (!(pk.bestIdx in cache)) { const pr = ML.knnPredict(d.X, d.y, fresh.X, CFG[pk.bestIdx]); let ok = 0; for (let i = 0; i < pr.length; i++) if (pr[i] === fresh.y[i]) ok++; cache[pk.bestIdx] = ok / pr.length; }
        best[mm].push(pk.best); nest[mm].push(pk.nested); truth[mm].push(cache[pk.bestIdx]);
      }
      res = { best, nest, truth, done: s + 1 }; yield (s + 1) / NDS;
    }
  }
  function run() { if (job) job.stop(); res = null; job = EVU.job(job1(++gen, n, signal, seed), { progress: pg, frame: refresh }); refresh(); }
  const mean = ML.mean, f1 = (v) => (100 * v).toFixed(1);
  function refresh() {
    L.plot.redraw(); S.plot.redraw(); S.card.querySelector('h3').textContent = 'At m = ' + m + ': one dot per dataset';
    if (!res || !res.done) { ['best', 'nest', 'truth', 'g1', 'g2'].forEach((k) => R.set(k, '…')); return; }
    const b = mean(res.best[m]), ne = mean(res.nest[m]), t = mean(res.truth[m]);
    R.set('best', f1(b) + '%'); R.set('nest', f1(ne) + '%'); R.set('truth', f1(t) + '%', 'good'); R.set('g1', ((b - t) * 100).toFixed(1) + ' points', b - t > 0.02 ? 'bad' : ''); R.set('g2', ((ne - t) * 100).toFixed(1) + ' points');
    sn.innerHTML = 'Over <b>' + res.done + '</b> datasets with <b>' + m + '</b> setting' + (m > 1 ? 's' : '') + ' tried: the reported best CV score averages <b>' + f1(b) + '%</b>, the nested estimate <b>' + f1(ne) + '%</b>, and the truth <b>' + f1(t) + '%</b>.';
    L.cap.innerHTML = 'Each point is an average over ' + res.done + ' simulated datasets of ' + n + ' rows. The vertical line marks m = ' + m + '. The reported score climbs as you try more settings; the truth does not.';
  }
  L.plot.draw = (p) => {
    const col = p.col; if (res) { const all = [].concat(...['best', 'nest', 'truth'].map((k) => res[k].slice(1).map((a) => mean(a)))); p.setLims(null, [Math.max(0, Math.floor((Math.min(...all) - 0.05) * 20) / 20), Math.min(1, Math.ceil((Math.max(...all) + 0.04) * 20) / 20)]); p._layout(); }
    p.axes({ xlabel: 'settings tried, m', ylabel: 'accuracy', xticks: [1, 10, 20, 30, 40, 50, 60], yfmt: (v) => Math.round(v * 100) + '%' }); if (!res) return;
    const line = (a, o) => p.line(a.map((v, i) => [i + 1, mean(v)]).slice(0, res.best.length - 1), o), A = (key) => res[key].slice(1);
    if (p.vy[0] < 0.5) p.seg(1, 0.5, MMAX, 0.5, { color: col.muted, w: 1, dash: [3, 4] });
    p.line(A('truth').map((v, i) => [i + 1, mean(v)]), { color: col.c[2], w: 2.8 }); p.line(A('nest').map((v, i) => [i + 1, mean(v)]), { color: col.c[0], w: 2.8, dash: [8, 5] }); p.line(A('best').map((v, i) => [i + 1, mean(v)]), { color: col.c[1], w: 3 });
    p.seg(m, p.vy[0], m, p.vy[1], { color: col.accent, w: 1.4, dash: [3, 3] }); if (res.done) { p.dot(m, mean(res.best[m]), { fill: col.c[1], r: 5 }); p.dot(m, mean(res.nest[m]), { fill: col.c[0], r: 5, shape: 'square' }); p.dot(m, mean(res.truth[m]), { fill: col.c[2], r: 5, shape: 'diamond' }); }
    p.setLabel('Average best CV score, nested estimate and truth against settings tried; at m = ' + m + ' they are ' + (res.done ? f1(mean(res.best[m])) + '%, ' + f1(mean(res.nest[m])) + '% and ' + f1(mean(res.truth[m])) + '%' : 'still being computed'));
  };
  L.plot.on('hover', (e) => { if (!res) return; const q = Math.round(e.x); if (q < 1 || q > MMAX) return UI.tip.hide(); UI.tip.show('<b>m = ' + q + '</b><br>best CV ' + f1(mean(res.best[q])) + '%<br>nested ' + f1(mean(res.nest[q])) + '%<br>truth ' + f1(mean(res.truth[q])) + '%', e.cx, e.cy); });
  S.plot.draw = (p) => {
    const col = p.col; if (res && res.done) { const all = [].concat(res.best[m], res.nest[m], res.truth[m]); p.setLims(null, [Math.max(0, Math.floor((Math.min(...all) - 0.09) * 20) / 20), Math.min(1.02, Math.ceil((Math.max(...all) + 0.03) * 20) / 20)]); p._layout(); }
    p.axes({ xticks: [1, 2, 3], xfmt: (v) => ['', 'Best CV score', 'Nested CV', 'Truth'][v] || '', yfmt: (v) => Math.round(v * 100) + '%', ylabel: 'accuracy' }); if (p.vy[0] < 0.5) p.seg(0.4, 0.5, 3.6, 0.5, { color: col.muted, w: 1, dash: [3, 4] }); if (!res || !res.done) return;
    [[1, res.best[m], col.c[1], 'triangle'], [2, res.nest[m], col.c[0], 'square'], [3, res.truth[m], col.c[2], 'diamond']].forEach(([x, a, c2, sh]) => { EVU.strip(p, x, a, { color: c2, shape: sh, width: 0.7, r: 3.8, seed: x * 3 }); const mm = mean(a); p.seg(x - 0.36, mm, x + 0.36, mm, { color: col.ink, w: 3 }); p.text(x, p.vy[0], f1(mm) + '%', { weight: 700, halo: true, size: 12.5, color: col.ink, align: 'center', base: 'bottom', dy: -6 }); });
  };
  S.plot.on('hover', (e) => { if (!res || !res.done) return; const x = Math.round(e.x); if (x < 1 || x > 3) return UI.tip.hide(); const a = [res.best, res.nest, res.truth][x - 1][m], s = ML.stats(a); UI.tip.show('<b>' + ['Best CV score', 'Nested CV', 'Truth'][x - 1] + '</b><br>mean ' + f1(s.mean) + '%<br>sd ' + (100 * s.sd).toFixed(1) + ' points<br>range ' + f1(s.min) + '% to ' + f1(s.max) + '%', e.cx, e.cy); });
  run();
})();
