/* Does a 70% forecast come true 70% of the time? Reliability diagrams for four classifiers on a made-up loan table. */
(function () {
  'use strict';
  const { stage, side } = UI.shell('decisions/reliability-diagram');
  const h = UI.h, NTR = 800, NTE = 3000, KMAX = 300;
  const LABEL = { logreg: 'Logistic regression', nb: 'Gaussian naive Bayes', knn: 'k-nearest neighbours', svm: 'SVM score through a plain sigmoid' };
  const HELP = {
    logreg: 'Fits the probability directly: log-loss is what it minimises.',
    nb: 'Treats the columns as independent. Income, bank balance and savings move together, so the same evidence is counted three times.',
    knn: 'The share of the k most similar past applicants who repaid. k = 1 copies a single neighbour.',
    svm: 'An SVM gives a distance from its boundary, not a probability. Here p = 1 / (1 + e<sup>−score</sup>), with nothing fitted.',
  };
  let kind = 'knn', k = 1, nb = 10, seed = 2, data = null, scorers = {}, views = {};

  const box = UI.predict(side, { title: 'Predict first', q: 'A very flexible model (it copies its single nearest past applicant) gives <b>90 to 100%</b> to many of the 3,000 test applicants. How many of them really repay?', options: ['About 95%', 'About 85%', 'About 70%', 'Can’t say: it depends on the model'], answer: 1,
    reveal: 'Press a button to see the measured answer.',
    onReveal() { kind = 'knn'; k = 1; nb = 10; selModel.set('knn'); kSlider.set(1); binSlider.set(10); sync(); refresh(); card.select(9); box.querySelector('.reveal').innerHTML = revealText(); } });
  function revealText() {
    const v = views.knn || (scorers.knn = ML.fitScorer('knn', data.tr.X, data.tr.y, { kmax: KMAX }), views.knn = scorers.knn.eval(data.te.X)), r = ML.reliability(v.prob(1), data.te.y, 10), b = r.bins[9];
    return '<b>About 85%.</b> The model says 100% for <b>' + DU.n(b.n) + '</b> of the 3,000 applicants, and <b>' + Math.round(100 * b.rate) + '%</b> of them really repaid. That is only a little above the <b>' + Math.round(100 * ML.mean(Array.from(data.te.y))) + '%</b> of all applicants who repay: one past applicant is a poor witness, so a forecast copied from one is far too sure of itself. The page now shows this model; slide k up to watch the dots move.';
  }

  const c = UI.panel(side, 'Model and data');
  const selModel = UI.select(c, { label: 'Classifier', value: kind, options: Object.keys(LABEL).map((v) => ({ value: v, label: LABEL[v] })), onChange(v) { kind = v; sync(); refresh(); } });
  const kSlider = UI.slider(c, { label: 'k, the neighbours that vote', min: 1, max: KMAX, log: true, step: 0.04, value: 1, fmt: (v) => String(Math.max(1, Math.round(v))), onInput(v) { k = Math.max(1, Math.round(v)); refresh(); } });
  const help = h('div', { class: 'note', style: { marginTop: '-4px', marginBottom: '14px' } }); c.append(help);
  const binSlider = UI.slider(c, { label: 'Number of bins', min: 5, max: 20, step: 1, value: nb, fmt: (v) => String(Math.round(v)), help: 'Forecasts are sorted into this many equal-width bins from 0 to 1.', onInput(v) { nb = Math.round(v); refresh(); } });
  UI.buttons(c, [{ label: 'New applicants', primary: true, onClick() { seed++; build(); } }]);
  const dnote = UI.note(c, '');
  function sync() { kSlider.el.style.display = kind === 'knn' ? '' : 'none'; help.innerHTML = HELP[kind]; }

  const rd = UI.panel(side, 'Scores on the 3,000 test applicants');
  const R = UI.read(rd, [
    { id: 'brier', label: 'Brier score', title: 'Mean squared gap between the forecast and what happened (1 or 0). Lower is better; 0 is perfect.' },
    { id: 'logloss', label: 'Log-loss', title: 'Average of −log of the probability given to what happened. Lower is better. Probabilities of exactly 0 or 1 are clipped at 1e-15, so one confident mistake costs about 36.' },
    { id: 'ece', label: 'Expected calibration error', title: 'Average gap between forecast and observed share across the bins, each bin weighted by its number of cases. 0 is perfect.' },
    { id: 'slope', label: 'Slope of the dots', title: 'How much the observed share changes when the forecast changes. 1 means parallel to the diagonal; below 1 is over-confident; above 1 is under-confident.' },
  ]);
  UI.note(rd, 'Hover over a score for its definition. Log-loss clips probabilities of exactly 0 or 1 at 1e-15, as scikit-learn does, so one confident mistake costs about 36.');

  const card = DU.relCard(stage, { title: 'Reliability diagram: what the model said against what happened', cap: 'Each dot is one bin of forecasts: its position is the average forecast (across) and the share that really repaid (up), and its size is the number of cases. On the dashed diagonal a 70% forecast comes true 70% of the time. The bars below count the cases in each bin.' });
  const vnote = h('div', { class: 'note callout', style: { margin: '10px 6px 0' } }); card.card.insertBefore(vnote, card.info);
  UI.legend(card.card, [{ label: 'the classifier on 3,000 test applicants', color: UI.colors().c[0], shape: 'circle' }, { label: 'perfectly calibrated', color: UI.colors().muted, shape: 'dash' }]);

  function build() {
    const [tr, te] = ML.loanSplit([NTR, NTE], ML.rng(seed * 7919 + 11)); data = { tr, te }; scorers = {}; views = {};
    dnote.innerHTML = 'The model learns from <b>' + NTR + '</b> made-up applicants and is scored on <b>' + DU.n(NTE) + '</b> fresh ones. <b>' + Math.round(100 * (1 - ML.mean(Array.from(te.y)))) + '%</b> of the test applicants default.';
    sync(); refresh();
  }
  function probs() {
    if (!views[kind]) { scorers[kind] = ML.fitScorer(kind, data.tr.X, data.tr.y, { kmax: KMAX }); views[kind] = scorers[kind].eval(data.te.X); }
    return views[kind].prob(kind === 'knn' ? k : undefined);
  }
  function refresh() {
    const p = probs(), y = data.te.y, rel = ML.reliability(p, y, nb), v = ML.verdict(rel);
    card.set([{ name: LABEL[kind], bins: rel, color: UI.colors().c[0], shape: 'circle' }]);
    R.set('brier', UI.f(ML.brier(p, y), 3)); R.set('logloss', UI.f(ML.logLoss(p, y), 3)); R.set('ece', UI.f(rel.ece, 3), rel.ece < 0.03 ? 'good' : rel.ece > 0.07 ? 'bad' : 'warn'); R.set('slope', UI.f(v.slope, 2));
    vnote.innerHTML = '<b>Verdict' + (kind === 'knn' ? ' (k = ' + k + ')' : '') + ':</b> ' + v.text + '. The dots have slope ' + UI.f(v.slope, 2) + ' (1 is ideal) and the expected calibration error is ' + UI.f(rel.ece, 3) + '.';
  }
  window.addEventListener('themechange', () => { refresh(); });
  build();
})();
