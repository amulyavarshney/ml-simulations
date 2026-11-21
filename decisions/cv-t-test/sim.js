/* The paired t-test across CV folds fools you: an A/A test (two equally good models) repeated on 300 fresh datasets, with the naive and the corrected resampled t-test. */
(function () {
  'use strict';
  const { stage, side } = UI.shell('decisions/cv-t-test');
  const h = UI.h, NCMP = 300, NROWS = 300, CB = 0.1;
  let K = 5, R = 5, seed = 1, res = null, job = null, gen = 0, shown = 0, first = null;

  const c = UI.panel(side, 'The comparison');
  UI.note(c, 'Model A is a logistic regression (C = 1). Model B is the same model with the regularisation changed to C = ' + CB + ': the weights move a little, the accuracy does not. Every comparison uses a <b>fresh</b> made-up table of ' + NROWS + ' applicants, so any “significant” result is a false alarm.');
  UI.slider(c, { label: 'Folds, K', min: 2, max: 10, step: 1, value: K, fmt: (v) => String(Math.round(v)), onInput: UI.debounce((v) => { K = Math.round(v); run(); }, 350) });
  UI.slider(c, { label: 'Repeats of K-fold, R', min: 1, max: 10, step: 1, value: R, fmt: (v) => String(Math.round(v)), help: 'Every repeat reshuffles the rows into new folds. K × R fold differences go into each t-test.', onInput: UI.debounce((v) => { R = Math.round(v); run(); }, 350) });
  const btn = UI.buttons(c, [{ id: 'run', label: 'Run ' + NCMP + ' comparisons again', primary: true, onClick() { seed++; run(); } }, { id: 'stop', label: 'Stop', onClick() { if (job) job.stop(); progressNote(); } }]);
  const pg = UI.progress(c);
  const rd = UI.panel(side, 'Over all the comparisons');
  const Rd = UI.read(rd, [{ id: 'j', label: 'Fold differences per test, J = K × R' }, { id: 'done', label: 'Comparisons done' }, { id: 'naive', label: 'Naive t-test: p < 0.05' }, { id: 'corr', label: 'Corrected t-test: p < 0.05' }, { id: 'mean', label: 'Average of A minus B' }, { id: 'dis', label: 'Rows where A and B differ' }]);
  UI.note(rd, 'If a test were honest, p < 0.05 would show up in about 5% of these comparisons, because the two models are equally good.');

  const one = UI.plotCard(stage, 'One comparison, fold by fold', { xlim: [0, 11], ylim: [-5, 5], aspectFn: DU.asp(2.8, 1.5), margin: { l: 52, r: 14, t: 12, b: 44 }, hover: true, label: 'Accuracy difference of A and B in each fold of one comparison' }, ' ');
  const nav = UI.buttons(one.card, [{ id: 'prev', label: '← Earlier comparison', onClick() { shown = Math.max(0, shown - 1); drawOne(); } }, { id: 'next', label: 'Next comparison →', onClick() { shown = Math.min(Math.max(0, (res ? res.done : 1) - 1), shown + 1); drawOne(); } }]);
  UI.legend(one.card, [{ label: 'A minus B in one fold', color: UI.colors().c[0], shape: 'circle' }, { label: 'average of the folds', color: UI.colors().c[1], shape: 'line' }, { label: 'zero: no difference', color: UI.colors().ink, shape: 'line' }]);
  const onote = UI.note(one.card, '', 'callout');

  const row = h('div', { class: 'row' }); stage.append(row); row.style.gridTemplateColumns = 'repeat(auto-fit, minmax(300px, 1fr))'; row.style.alignItems = 'start';
  const mkH = (title, id) => UI.plotCard(row, title, { xlim: [0, 1], ylim: [0, 60], aspectFn: DU.asp(1.55, 1.4), margin: { l: 46, r: 12, t: 12, b: 44 }, hover: true, label: 'Histogram of p-values: ' + title }, ' ');
  const HN = mkH('Naive paired t-test', 'naive'), HC = mkH('Corrected resampled t-test', 'corr'), hs = { naive: HN, corr: HC };
  UI.legend(HC.card, [{ label: 'p < 0.05: a false alarm', color: UI.colors().c[7], shape: 'square' }, { label: 'other p-values', color: UI.colors().c[0], shape: 'square' }, { label: 'what an honest test gives', color: UI.colors().ink, shape: 'dash' }]);
  const T = EVU.card(stage, 'False alarms'); const tab = EVU.table(T, ['Test', 'p < 0.05', 'Rate', 'If honest'], [['', '', '', ''], ['', '', '', '']], { cls: 'compact', caption: 'False-positive rate of the naive and the corrected t-test' });
  const tnote = UI.note(T, '', 'callout');
  UI.note(T, '<b>Naive:</b> t = mean / (s / √J), as if the J fold differences were independent, with J − 1 degrees of freedom. <b>Corrected</b> (Nadeau and Bengio): the variance of the mean is s² (1/J + n<sub>test</sub> / n<sub>train</sub>) instead of s² / J, because folds share training rows and their differences are not independent. The p-values come from a Student-t distribution built in this page.');

  const f1 = (v) => (v >= 0 ? '+' : '−') + Math.abs(100 * v).toFixed(2);
  function oneRun(i) { return ML.aaComparison(seed * 100003 + i, { n: NROWS, K, R, cA: 1, cB: CB }); }
  function run() {
    if (job) job.stop(); const my = ++gen; res = { cmps: [], done: 0, naive: [], corr: [], mean: [], dis: [] }; shown = 0; first = oneRun(0); drawOne();
    job = EVU.job(g(my), { progress: pg, frame: () => { refresh(); }, done() { refresh(); } }); refresh();
  }
  function* g(my) {
    for (let i = 0; i < NCMP; i++) { if (my !== gen) return; const r = i === 0 ? first : oneRun(i); res.cmps.push(r); res.naive.push(r.naive.p); res.corr.push(r.corrected.p); res.mean.push(ML.mean(r.d)); res.dis.push(r.disagree); res.done = i + 1; yield (i + 1) / NCMP; }
  }
  function progressNote() { refresh(); }
  function refresh() {
    const n = res ? res.done : 0, J = K * R;
    Rd.set('j', K + ' × ' + R + ' = ' + J); Rd.set('done', n + ' of ' + NCMP);
    if (!n) { ['naive', 'corr', 'mean', 'dis'].forEach((k) => Rd.set(k, '…')); }
    else {
      const fn = res.naive.filter((p) => p < 0.05).length, fc = res.corr.filter((p) => p < 0.05).length, m = ML.mean(res.mean), sd = ML.stats(res.mean).sd, se = sd / Math.sqrt(n);
      Rd.set('naive', fn + ' of ' + n + ' (' + DU.pct(fn / n, 1) + ')', fn / n > 0.1 ? 'bad' : 'good'); Rd.set('corr', fc + ' of ' + n + ' (' + DU.pct(fc / n, 1) + ')', fc / n > 0.1 ? 'bad' : 'good');
      Rd.set('mean', f1(m) + ' points (± ' + (100 * se).toFixed(2) + ')'); Rd.set('dis', DU.pct(ML.mean(res.dis), 1));
      tab.set([['Naive paired t-test', { text: fn + ' of ' + n, cls: fn / n > 0.1 ? 'bad' : '' }, { text: DU.pct(fn / n, 1), cls: fn / n > 0.1 ? 'bad' : '' }, 'about 5%'], ['Corrected resampled t-test', fc + ' of ' + n, DU.pct(fc / n, 1), 'about 5%']]);
      tnote.innerHTML = 'In <b>' + n + '</b> comparisons of two models that are equally good (average accuracy difference <b>' + f1(m) + '</b> points, standard error ' + (100 * se).toFixed(2) + '), the naive t-test called a winner <b>' + fn + '</b> times (<b>' + DU.pct(fn / n, 1) + '</b>) and the corrected t-test <b>' + fc + '</b> times (<b>' + DU.pct(fc / n, 1) + '</b>), with K = ' + K + ' folds repeated R = ' + R + ' times.';
    }
    if (!n) tnote.innerHTML = 'Running…';
    HN.plot.redraw(); HC.plot.redraw(); drawOne();
  }
  function drawOne() {
    const r = res && res.cmps[shown] ? res.cmps[shown] : first; if (!r) return; one._r = r; one.plot.redraw();
    const m = r.naive.mean; one.card.querySelector('h3').textContent = 'One comparison, fold by fold (number ' + (shown + 1) + ')';
    onote.innerHTML = 'Average difference <b>' + f1(m) + '</b> points over <b>' + r.d.length + '</b> folds. <b>Naive t-test:</b> t = ' + UI.f(r.naive.t, 2) + ', p = <b>' + UI.f(r.naive.p, 3) + '</b>' + (r.naive.p < 0.05 ? ' (“significant”)' : '') + '. <b>Corrected:</b> t = ' + UI.f(r.corrected.t, 2) + ', p = <b>' + UI.f(r.corrected.p, 3) + '</b>' + (r.corrected.p < 0.05 ? ' (“significant”)' : '') + '.';
  }
  one.plot.draw = (p) => {
    const r = one._r; if (!r) return; const col = p.col, d = r.d.map((v) => 100 * v), J = d.length, mx = Math.max(2, Math.ceil(Math.max(...d.map(Math.abs)) + 0.5));
    p.setLims([0, J + 1], [-mx, mx]); p._layout(); p.axes({ xlabel: 'fold (repeats follow one another)', ylabel: 'A minus B (points)', xticks: J <= 12 ? d.map((_, i) => i + 1) : ML.niceTicks(1, J, 8), yfmt: (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(+v.toFixed(2)), zero: true });
    p.seg(0, 0, J + 1, 0, { color: col.ink, w: 1.6 }); const m = ML.mean(d); p.seg(0.4, m, J + 0.6, m, { color: col.c[1], w: 2.8 });
    d.forEach((v, i) => p.dot(i + 1, v, { fill: col.c[0], r: 5, alpha: 0.9 }));
    p.setLabel('Accuracy differences of A and B in ' + J + ' folds of one comparison; average ' + m.toFixed(2) + ' points; naive p ' + r.naive.p.toFixed(3) + ', corrected p ' + r.corrected.p.toFixed(3));
  };
  one.plot.on('hover', (e) => { const r = one._r; if (!r) return; const i = Math.round(e.x) - 1; if (i < 0 || i >= r.d.length) return UI.tip.hide(); UI.tip.show('<b>fold ' + (i + 1) + '</b><br>A minus B: ' + (100 * r.d[i]).toFixed(2) + ' points', e.cx, e.cy); });
  Object.keys(hs).forEach((key) => {
    const H = hs[key];
    H.plot.draw = (p) => {
      const col = p.col, v = res ? res[key] : [], cnt = v.length ? EVU.bin(v, 0, 1, 0.05) : [], n = NCMP, exp = n / 20; const mx = Math.max(exp * 1.4, ...cnt), top = Math.ceil(mx / 10) * 10;
      p.setLims([0, 1], [0, top]); p._layout(); p.axes({ xlabel: 'p-value', ylabel: 'comparisons', xticks: [0, 0.2, 0.4, 0.6, 0.8, 1], xfmt: (x) => x.toFixed(1), yticks: ML.niceTicks(0, top, 4) });
      cnt.forEach((k, i) => { if (k) p.rect(i * 0.05 + 0.003, 0, (i + 1) * 0.05 - 0.003, k, { fill: i === 0 ? col.c[7] : col.c[0], alpha: 0.88, stroke: col.surface, w: 1 }); });
      p.seg(0, exp, 1, exp, { color: col.ink, w: 1.8, dash: [6, 5] });
      if (v.length) p.setLabel(H.card.querySelector('h3').textContent + ': ' + cnt[0] + ' of ' + v.length + ' p-values below 0.05');
    };
    H.plot.on('hover', (e) => { if (!res || !res.done) return; const i = Math.floor(e.x / 0.05); if (i < 0 || i > 19) return UI.tip.hide(); const k = res[key].filter((q) => q >= i * 0.05 && (q < (i + 1) * 0.05 || (i === 19 && q <= 1))).length; UI.tip.show('<b>p from ' + (i * 0.05).toFixed(2) + ' to ' + ((i + 1) * 0.05).toFixed(2) + '</b><br>' + k + ' of ' + res.done + ' comparisons', e.cx, e.cy); });
  });
  window.addEventListener('themechange', () => { refresh(); });
  run();
})();
