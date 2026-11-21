/* Fixing the probabilities: Platt scaling and isotonic regression, fitted on a separate calibration set and applied to held-out rows. */
(function () {
  'use strict';
  const { stage, side } = UI.shell('decisions/calibration-fix');
  const h = UI.h, NTR = 800, NCAL = 2000, NTE = 3000, MS = [50, 100, 200, 500, 1000, 2000], NREP = 30;
  const MODELS = { svm: { label: 'SVM score through a plain sigmoid', kind: 'svm' }, nb: { label: 'Gaussian naive Bayes', kind: 'nb' }, knn: { label: 'k-nearest neighbours, k = 5', kind: 'knn', k: 5 } };
  let model = 'svm', m = 100, onTrain = false, seed = 3, D = null, rep = null, job = null, gen = 0, metric = 'brier', cur = null;

  const c = UI.panel(side, 'The model to fix');
  UI.select(c, { label: 'Classifier', value: model, options: Object.keys(MODELS).map((v) => ({ value: v, label: MODELS[v].label })), onChange(v) { model = v; rep = null; build(); } });
  UI.note(c, 'It learns from ' + NTR + ' made-up applicants. Its raw probabilities are not calibrated.');
  const c2 = UI.panel(side, 'Calibration data');
  const mSlider = UI.slider(c2, { label: 'Rows in the calibration set', min: 50, max: 2000, log: true, step: 0.04, value: m, fmt: (v) => DU.n(snap(v)), help: 'Fresh applicants the model has never seen. Both calibrators learn from these rows only.', onInput(v) { m = snap(v); refresh(); } });
  const trainBox = UI.check(c2, { label: 'Calibrate on the same rows the model was trained on', value: false, help: 'There are only ' + NTR + ' training rows, so at most ' + NTR + ' are used.', onChange(v) { onTrain = v; refresh(); } });
  UI.buttons(c2, [{ label: 'New data', primary: true, onClick() { seed++; rep = null; build(); } }, { id: 'rep', label: 'Repeat on ' + NREP + ' new datasets', onClick() { repeat(); } }]);
  const pg = UI.progress(c2);
  const rd = UI.panel(side, 'The two calibrators');
  const R = UI.read(rd, [{ id: 'rows', label: 'Rows used' }, { id: 'platt', label: 'Platt: slope a' }, { id: 'plattb', label: 'Platt: intercept b' }, { id: 'steps', label: 'Isotonic: flat steps' }]);
  UI.note(rd, 'Platt scaling: p = 1 / (1 + e<sup>−(a · score + b)</sup>), two numbers fitted by Newton’s method. Isotonic regression: a staircase that never goes down, fitted by pooling adjacent rows that break the order.');

  const card = DU.relCard(stage, { title: 'Reliability on 3,000 held-out test applicants: before and after', cap: 'Each marker is one bin of forecasts, with 10 bins. The more a curve hugs the dashed diagonal, the more a forecast can be taken at face value. The bars count the raw forecasts per bin.' });
  UI.legend(card.card, [{ label: 'raw model', color: UI.colors().c[1], shape: 'triangle' }, { label: 'after Platt scaling', color: UI.colors().c[0], shape: 'circle' }, { label: 'after isotonic regression', color: UI.colors().c[2], shape: 'diamond' }, { label: 'perfectly calibrated', color: UI.colors().muted, shape: 'dash' }]);
  const T = EVU.card(stage, 'Scores on the test applicants');
  const tab = EVU.table(T, ['', 'Brier', 'Log-loss', 'Calib. error', 'AUC'], [['', '', '', '', ''], ['', '', '', '', ''], ['', '', '', '', '']], { cls: 'compact', caption: 'Brier score, log-loss, expected calibration error and AUC for the raw model, after Platt scaling and after isotonic regression' });
  const tnote = UI.note(T, '', 'callout');
  UI.note(T, 'Lower is better for the first three columns. AUC (area under the ROC curve) measures only the ranking: 1 is perfect, 0.5 a coin flip. Log-loss is clipped at 1e-15 as in scikit-learn, so a calibrator that says exactly 0 or 1 pays about 36 for every mistake.');
  const M = UI.plotCard(stage, 'The two maps: model score in, probability out', { xlim: [-1, 1], ylim: [0, 1], aspectFn: DU.asp(1.9, 1.3), margin: { l: 52, r: 14, t: 12, b: 42 }, hover: true, label: 'Calibration maps' }, 'The ticks on the top edge are calibration rows that repaid; those on the bottom edge defaulted. The Platt curve is a smooth S; the isotonic curve is a staircase that climbs where repayers outnumber defaulters.');
  UI.legend(M.card, [{ label: 'plain sigmoid of the score', color: UI.colors().c[1], shape: 'dash' }, { label: 'Platt scaling', color: UI.colors().c[0], shape: 'line' }, { label: 'isotonic regression', color: UI.colors().c[2], shape: 'line' }]);
  const Rp = UI.plotCard(stage, 'Repeat on ' + NREP + ' new datasets: average test score against calibration rows', { xlim: [-0.4, MS.length - 0.6], ylim: [0.1, 0.2], aspectFn: DU.asp(2.1, 1.4), margin: { l: 58, r: 14, t: 12, b: 44 }, hover: true, label: 'Average test score against the number of calibration rows' }, ' ');
  const sg = UI.seg(Rp.card, { label: 'Score', options: [{ value: 'brier', label: 'Brier score' }, { value: 'ece', label: 'Calibration error' }, { value: 'll', label: 'Log-loss' }], value: metric, onChange(v) { metric = v; Rp.plot.redraw(); } }); Rp.card.insertBefore(sg.el, Rp.host);
  UI.legend(Rp.card, [{ label: 'raw model', color: UI.colors().c[1], shape: 'dash' }, { label: 'Platt scaling', color: UI.colors().c[0], shape: 'circle' }, { label: 'isotonic regression', color: UI.colors().c[2], shape: 'diamond' }]);
  const rnote = UI.note(Rp.card, 'Press “Repeat on ' + NREP + ' new datasets” to measure it.', 'callout');

  function snap(v) { const x = Math.round(v), g = MS.find((q) => Math.abs(q - x) / q < 0.05); return g || x; }
  function metr(p, y) { const rel = ML.reliability(p, y, 10); return { brier: ML.brier(p, y), ll: ML.logLoss(p, y), ece: rel.ece, auc: ML.auc(p, y), rel }; }
  function makeSet(sd) {
    const [tr, cal, te] = ML.loanSplit([NTR, NCAL, NTE], ML.rng(sd * 6151 + 7)), mdl = MODELS[model], sc = ML.fitScorer(mdl.kind, tr.X, tr.y, { kmax: 50 }), vt = sc.eval(te.X), vc = sc.eval(cal.X), vtr = sc.eval(tr.X), k = mdl.k;
    return { tr, cal, te, st: vt.score(k), pt: vt.prob(k), scal: vc.score(k), str: vtr.score(k) };
  }
  function build() { if (job) job.stop(); D = makeSet(seed); refresh(); drawRep(); }
  function refresh() {
    const n = onTrain ? Math.min(m, NTR) : m, s = onTrain ? D.str.subarray(0, n) : D.scal.subarray(0, n), y = onTrain ? D.tr.y.subarray(0, n) : D.cal.y.subarray(0, n);
    const pl = ML.plattFit(s, y), iso = ML.isotonicFit(s, y), p0 = D.pt, pP = pl.applyMany(D.st), pI = iso.applyMany(D.st), yt = D.te.y;
    const a0 = metr(p0, yt), aP = metr(pP, yt), aI = metr(pI, yt); cur = { pl, iso, s, y, n };
    const col = UI.colors();
    card.set([{ name: 'raw model', bins: a0.rel, color: col.c[1], shape: 'triangle', fixed: true, dash: [6, 4] }, { name: 'Platt scaling', bins: aP.rel, color: col.c[0], shape: 'circle', fixed: true }, { name: 'isotonic regression', bins: aI.rel, color: col.c[2], shape: 'diamond', fixed: true }], { hist: 0 });
    const best = (k, lowGood) => { const v = [a0[k], aP[k], aI[k]]; const b = lowGood ? Math.min(...v) : Math.max(...v); return v.map((x) => (Math.abs(x - b) < 1e-12 ? 'good' : '')); };
    const row = (name, a, i) => [name, { text: UI.f(a.brier, 4), cls: best('brier', true)[i] }, { text: UI.f(a.ll, 3), cls: best('ll', true)[i] }, { text: UI.f(a.ece, 3), cls: best('ece', true)[i] }, UI.f(a.auc, 4)];
    tab.set([row('Raw model', a0, 0), row('Platt', aP, 1), row('Isotonic', aI, 2)]);
    R.set('rows', DU.n(n) + (onTrain ? ' (training rows)' : '')); R.set('platt', UI.f(pl.a, 2)); R.set('plattb', UI.f(pl.b, 2)); R.set('steps', String(iso.levels));
    tnote.innerHTML = 'Calibration error: raw <b>' + UI.f(a0.ece, 3) + '</b>, Platt <b>' + UI.f(aP.ece, 3) + '</b>, isotonic <b>' + UI.f(aI.ece, 3) + '</b>. Ranking (AUC): raw <b>' + UI.f(a0.auc, 4) + '</b>, Platt <b>' + UI.f(aP.auc, 4) + '</b>, isotonic <b>' + UI.f(aI.auc, 4) + '</b>. ' + (Math.abs(aP.auc - a0.auc) < 1e-12 ? 'Platt scaling is an increasing curve, so it cannot reorder the applicants. ' : '') + (aI.auc < a0.auc - 1e-6 ? 'Isotonic gives different applicants the same value, and a tie counts as half a correct ordering.' : '');
    trainBox.el.querySelector('.help').innerHTML = 'There are only ' + NTR + ' training rows, so at most ' + NTR + ' are used.' + (onTrain && m > NTR ? ' <b>Using ' + NTR + ' now.</b>' : '');
    M.plot.redraw();
  }
  M.plot.draw = (p) => {
    if (!D || !cur) return; const col = p.col, sorted = Array.from(D.st).sort((a, b) => a - b), lo = sorted[Math.floor(sorted.length * 0.01)], hi = sorted[Math.floor(sorted.length * 0.99)], pad = (hi - lo) * 0.06;
    p.setLims([lo - pad, hi + pad], [0, 1]); p._layout();
    p.axes({ xlabel: 'model score (higher means more likely to repay)', ylabel: 'probability', yticks: [0, 0.2, 0.4, 0.6, 0.8, 1], yfmt: (v) => v.toFixed(1), xfmt: (v) => +v.toFixed(2) + '' });
    const nr = Math.min(cur.n, 700); for (let i = 0; i < nr; i++) { const x = cur.s[i]; if (x < p.vx[0] || x > p.vx[1]) continue; if (cur.y[i] > 0) p.seg(x, 0.955, x, 1, { color: col.c[2], w: 1.2, alpha: 0.5 }); else p.seg(x, 0, x, 0.045, { color: col.c[7], w: 1.2, alpha: 0.5 }); }
    const N = 300, xs = Array.from({ length: N + 1 }, (_, i) => p.vx[0] + (p.vx[1] - p.vx[0]) * i / N);
    p.line(xs.map((x) => [x, ML.sigmoid(x)]), { color: col.c[1], w: 2, dash: [6, 4] });
    p.line(xs.map((x) => [x, cur.pl.apply(x)]), { color: col.c[0], w: 3 }); p.line(xs.map((x) => [x, cur.iso.apply(x)]), { color: col.c[2], w: 2.6 });
    p.setLabel('Calibration maps: Platt slope ' + cur.pl.a.toFixed(2) + ', intercept ' + cur.pl.b.toFixed(2) + '; isotonic with ' + cur.iso.levels + ' flat steps');
  };
  M.plot.on('hover', (e) => { if (!cur) return; UI.tip.show('<b>score ' + e.x.toFixed(2) + '</b><br>plain sigmoid ' + ML.sigmoid(e.x).toFixed(2) + '<br>Platt ' + cur.pl.apply(e.x).toFixed(2) + '<br>isotonic ' + cur.iso.apply(e.x).toFixed(2), e.cx, e.cy); });

  /* ---- repeat on many datasets ---- */
  function* repGen(my) {
    const acc = { none: [], platt: MS.map(() => []), iso: MS.map(() => []), tp: [], ti: [] };
    for (let s = 0; s < NREP; s++) {
      const d = makeSet(seed * 1000 + s + 1); acc.none.push(metr(d.pt, d.te.y));
      MS.forEach((mm, j) => { const pl = ML.plattFit(d.scal.subarray(0, mm), d.cal.y.subarray(0, mm)), iso = ML.isotonicFit(d.scal.subarray(0, mm), d.cal.y.subarray(0, mm)); acc.platt[j].push(metr(pl.applyMany(d.st), d.te.y)); acc.iso[j].push(metr(iso.applyMany(d.st), d.te.y)); });
      acc.tp.push(metr(ML.plattFit(d.str, d.tr.y).applyMany(d.st), d.te.y)); acc.ti.push(metr(ML.isotonicFit(d.str, d.tr.y).applyMany(d.st), d.te.y));
      if (my !== gen) return; rep = { acc, done: s + 1 }; yield (s + 1) / NREP;
    }
  }
  function repeat() { if (job) job.stop(); rep = null; const my = ++gen; job = EVU.job(repGen(my), { progress: pg, frame: drawRep }); drawRep(); }
  const mean = (a, k) => ML.mean(a.map((q) => q[k]));
  function drawRep() {
    Rp.plot.redraw();
    if (!rep) { rnote.innerHTML = 'Press “Repeat on ' + NREP + ' new datasets” to measure it for ' + MODELS[model].label + '.'; return; }
    const a = rep.acc, n = rep.done, worse = (j) => a.iso[j].filter((q, i) => q.brier > a.platt[j][i].brier).length, j100 = MS.indexOf(100), j2000 = MS.indexOf(2000);
    rnote.innerHTML = '<b>' + MODELS[model].label + ', ' + n + ' datasets.</b> Isotonic regression had a worse Brier score than Platt scaling on <b>' + worse(j100) + ' of ' + n + '</b> datasets with 100 calibration rows and on <b>' + worse(j2000) + ' of ' + n + '</b> with 2,000. Calibrating on the ' + NTR + ' training rows instead of fresh rows: calibration error <b>' + UI.f(mean(a.tp, 'ece'), 3) + '</b> for Platt and <b>' + UI.f(mean(a.ti, 'ece'), 3) + '</b> for isotonic, against <b>' + UI.f(mean(a.platt[MS.indexOf(500)], 'ece'), 3) + '</b> and <b>' + UI.f(mean(a.iso[MS.indexOf(500)], 'ece'), 3) + '</b> with 500 fresh rows.';
  }
  Rp.plot.draw = (p) => {
    const col = p.col; const key = metric, nm = { brier: 'Brier score', ece: 'calibration error', ll: 'log-loss' }[key];
    let lo = Infinity, hi = -Infinity, av = null;
    if (rep && rep.done) { av = { none: mean(rep.acc.none, key), platt: rep.acc.platt.map((q) => mean(q, key)), iso: rep.acc.iso.map((q) => mean(q, key)) }; [av.none].concat(av.platt, av.iso).forEach((v) => { lo = Math.min(lo, v); hi = Math.max(hi, v); }); const pad = (hi - lo) * 0.12 || 0.01; lo = Math.max(0, lo - pad); hi += pad; p.setLims(null, [lo, hi]); p._layout(); }
    p.axes({ xlabel: 'rows in the calibration set', ylabel: nm, xticks: MS.map((_, i) => i), xfmt: (v) => DU.n(MS[v] || 0), yfmt: (v) => +v.toFixed(3) + '' }); if (!av) return;
    p.seg(-0.4, av.none, MS.length - 0.6, av.none, { color: col.c[1], w: 2.4, dash: [7, 5] });
    p.line(av.platt.map((v, i) => [i, v]), { color: col.c[0], w: 2.6 }); p.line(av.iso.map((v, i) => [i, v]), { color: col.c[2], w: 2.6 });
    av.platt.forEach((v, i) => { p.dot(i, v, { fill: col.c[0], r: 4.5 }); p.dot(i, av.iso[i], { fill: col.c[2], shape: 'diamond', r: 4.5 }); });
    p.setLabel('Average ' + nm + ' against calibration rows over ' + rep.done + ' datasets: raw model ' + av.none.toFixed(3) + '; Platt from ' + av.platt[0].toFixed(3) + ' at 50 rows to ' + av.platt[MS.length - 1].toFixed(3) + ' at 2,000; isotonic from ' + av.iso[0].toFixed(3) + ' to ' + av.iso[MS.length - 1].toFixed(3));
  };
  Rp.plot.on('hover', (e) => { if (!rep || !rep.done) return; const i = Math.round(e.x); if (i < 0 || i >= MS.length) return UI.tip.hide(); const a = rep.acc; UI.tip.show('<b>' + DU.n(MS[i]) + ' calibration rows</b><br>raw ' + mean(a.none, metric).toFixed(3) + '<br>Platt ' + mean(a.platt[i], metric).toFixed(3) + '<br>isotonic ' + mean(a.iso[i], metric).toFixed(3), e.cx, e.cy); });
  window.addEventListener('themechange', () => { refresh(); });
  build(); setTimeout(repeat, 500);
})();
