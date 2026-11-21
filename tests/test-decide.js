// node tests/test-decide.js : checks ml-decide.js (calibration, decisions from costs, model comparison) against scikit-learn and SciPy, and by property
global.self = global; const ML = require('../assets/ml-decide.js'); const ref = require('./reference_decide.json');
let fails = 0; const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); if (!cond) fails++; };
const maxabs = (a, b) => Math.max(...Array.from(a).map((v, i) => Math.abs(v - b[i])));
const maxrel = (a, b) => Math.max(...Array.from(a).map((v, i) => Math.abs(v - b[i]) / Math.max(Math.abs(b[i]), 1e-300)));
const sci = (v) => v.toExponential(1);

/* ---------------- against scikit-learn / SciPy ---------------- */
{
  const d = Math.max(...ref.scores.map((c) => Math.abs(ML.brier(c.p, c.y) - c.brier))); ok('Brier score equals brier_score_loss on ' + ref.scores.length + ' sets', d < 1e-13, 'max diff ' + sci(d));
  const d2 = Math.max(...ref.scores.map((c) => Math.abs(ML.logLoss(c.p_ll, c.y) - c.logloss))); ok('log-loss equals log_loss on ' + ref.scores.length + ' sets', d2 < 1e-12, 'max diff ' + sci(d2));
  const c = ref.logloss_clip, dc = Math.abs(ML.logLoss(c.p, c.y) - c.logloss); ok('log-loss clips probabilities of exactly 0 and 1 the way log_loss does', dc < 1e-9, 'JS ' + ML.logLoss(c.p, c.y).toFixed(6) + ' sklearn ' + c.logloss.toFixed(6));
}
{
  let worst = 0, cnt = true, okEce = 0, mism = 0;
  for (const c of ref.calibration) {
    const r = ML.reliability(c.p, c.y, c.n_bins), nz = r.bins.filter((b) => b.n > 0);
    if (nz.length !== c.prob_true.length) { mism++; continue; }
    worst = Math.max(worst, maxabs(nz.map((b) => b.rate), c.prob_true), maxabs(nz.map((b) => b.meanP), c.prob_pred));
    cnt = cnt && r.bins.every((b, i) => b.n === c.counts[i]); okEce = Math.max(okEce, Math.abs(r.ece - c.ece));
  }
  ok('reliability bins equal calibration_curve(strategy="uniform"): mean forecast and observed share, ' + ref.calibration.length + ' cases (5, 7, 10, 20 bins; ties on bin edges)', mism === 0 && worst < 1e-12, 'max diff ' + sci(worst));
  ok('the number of cases in every bin equals the numpy bin counts (searchsorted rule)', mism === 0 && cnt);
  ok('expected calibration error equals the weighted gap computed from calibration_curve', okEce < 1e-12, 'max diff ' + sci(okEce));
}
{
  let wx = 0, wy = 0, wf = 0, wp = 0, sameLen = true;
  for (const c of ref.isotonic) {
    const m = ML.isotonicFit(c.x, c.y); sameLen = sameLen && m.X.length === c.X_thr.length;
    if (m.X.length === c.X_thr.length) { wx = Math.max(wx, maxabs(m.X, c.X_thr)); wy = Math.max(wy, maxabs(m.Y, c.y_thr)); }
    wf = Math.max(wf, maxabs(m.applyMany(c.x), c.fit)); wp = Math.max(wp, maxabs(m.applyMany(c.grid), c.pred));
  }
  ok('isotonic regression: the kept thresholds X_thresholds_ and y_thresholds_ equal IsotonicRegression (continuous scores and heavy ties), ' + ref.isotonic.length + ' cases', sameLen && wx < 1e-12 && wy < 1e-12, 'max diff ' + sci(Math.max(wx, wy)));
  ok('isotonic regression: fitted values at the training points and interpolated predictions (clipped outside the range) equal IsotonicRegression.predict', wf < 1e-12 && wp < 1e-12, 'max diff ' + sci(Math.max(wf, wp)));
}
{
  let wa = 0, wb = 0; for (const c of ref.platt) { const m = ML.plattFit(c.s, c.y); wa = Math.max(wa, Math.abs(m.a - c.a)); wb = Math.max(wb, Math.abs(m.b - c.b)); }
  ok('Platt scaling: slope and intercept equal an unregularised LogisticRegression (C = 1e10) of y on the score, ' + ref.platt.length + ' cases', wa < 1e-6 && wb < 1e-6, 'max diff ' + sci(Math.max(wa, wb)));
}
{
  const g = ref.gnb, m = ML.gnbFit(g.X, g.y), d = maxabs(g.Xt.map((x) => m.prob(x)), g.prob), dv = Math.max(maxabs(m.var[0], g.var[0]), maxabs(m.var[1], g.var[1])), dm = Math.max(maxabs(m.mean[0], g.theta[0]), maxabs(m.mean[1], g.theta[1]));
  ok('Gaussian naive Bayes: class means, variances and probabilities equal GaussianNB', d < 1e-10 && dv < 1e-12 && dm < 1e-12, 'max diff in probability ' + sci(d));
  const k = ref.knn, prof = ML.knnProfile(k.X, k.y, k.Xt, 40); let dk = 0; for (const c of k.cases) dk = Math.max(dk, maxabs(prof.prob(c.k), c.prob));
  ok('k-NN vote profile: probabilities for k = 1, 3, 5, 15, 40 equal KNeighborsClassifier.predict_proba', dk < 1e-12, 'max diff ' + sci(dk));
}
{
  let de = 0, dc = 0, dp = 0; for (const c of ref.mcnemar) { de = Math.max(de, Math.abs(ML.mcnemarExact(c.b, c.c) - c.exact) / c.exact); const r = ML.mcnemarChi2(c.b, c.c); dc = Math.max(dc, Math.abs(r.stat - c.stat)); dp = Math.max(dp, Math.abs(r.p - c.chi2_p) / Math.max(c.chi2_p, 1e-300)); }
  ok('exact McNemar p-value equals scipy.stats.binomtest on ' + ref.mcnemar.length + ' (b, c) pairs', de < 1e-9, 'max relative diff ' + sci(de));
  ok('McNemar chi-square statistic and its p-value equal the formula with scipy.stats.chi2', dc < 1e-12 && dp < 1e-9, 'max relative diff in p ' + sci(dp));
  ok('McNemar with no disagreements gives p = 1', ML.mcnemarExact(0, 0) === 1 && ML.mcnemarChi2(0, 0).p === 1);
}
{
  const dc = Math.max(...ref.t.map((c) => Math.abs(ML.tCdf(c.t, c.df) - c.cdf))), dp = Math.max(...ref.t.filter((c) => c.t !== 0).map((c) => Math.abs(ML.tTwoSided(c.t, c.df) - c.p2) / c.p2));
  ok('Student-t CDF equals scipy.stats.t.cdf on ' + ref.t.length + ' (t, df) pairs', dc < 1e-12, 'max abs diff ' + sci(dc));
  ok('two-sided Student-t p-value equals 2 * scipy.stats.t.sf, down to tiny p (relative error)', dp < 1e-10, 'max relative diff ' + sci(dp));
  const dx = Math.max(...ref.chi2.map((c) => Math.abs(ML.chi2Sf(c.x, c.k) - c.sf) / c.sf)); ok('chi-square survival function equals scipy.stats.chi2.sf on ' + ref.chi2.length + ' points', dx < 1e-10, 'max relative diff ' + sci(dx));
  const db = Math.max(...ref.beta.map((c) => Math.abs(ML.betaInc(c.a, c.b, c.x) - c.v) / Math.max(c.v, 1e-300))); ok('regularised incomplete beta function equals scipy.special.betainc on ' + ref.beta.length + ' points', db < 1e-10, 'max relative diff ' + sci(db));
  const dn = Math.max(...ref.norm.map((c) => Math.abs(ML.normCdf(c.z) - c.cdf))); ok('normal CDF equals scipy.stats.norm.cdf', dn < 1e-13, 'max abs diff ' + sci(dn));
}
{
  let d1 = 0, d2 = 0; for (const c of ref.ttests) { const a = ML.pairedT(c.d), b = ML.correctedT(c.d, c.n_test, c.n_train); d1 = Math.max(d1, Math.abs(a.p - c.naive_p) / c.naive_p, Math.abs(a.t - c.naive_t) / Math.abs(c.naive_t)); d2 = Math.max(d2, Math.abs(b.p - c.corr_p) / c.corr_p, Math.abs(b.t - c.corr_t) / Math.abs(c.corr_t)); }
  ok('paired t-test on fold differences equals scipy.stats.ttest_1samp (t and p), ' + ref.ttests.length + ' cases', d1 < 1e-9, 'max relative diff ' + sci(d1));
  ok('Nadeau-Bengio corrected t-test: t and p equal the formula s^2 (1/J + n_test/n_train) evaluated with scipy.stats.t', d2 < 1e-9, 'max relative diff ' + sci(d2));
}
{
  let worst = 0, cntOk = true; for (const c of ref.groups) {
    const m = ML.groupMetrics(c.p, c.y, c.g, c.thr, 1000, 9000);
    c.groups.forEach((r, k) => { const q = m.groups[k]; cntOk = cntOk && q.tn === r.tn && q.fp === r.fp && q.fn === r.fn && q.tp === r.tp; worst = Math.max(worst, Math.abs(q.precision - r.precision), Math.abs(q.tpr - r.tpr), Math.abs(q.fpr - r.fpr), Math.abs(q.approval - r.approval)); });
    cntOk = cntOk && m.all.tp === m.groups[0].tp + m.groups[1].tp && m.all.n === c.p.length;
  }
  ok('per-group confusion counts equal sklearn confusion_matrix (3 cases, different threshold per group)', cntOk);
  ok('per-group precision, true positive rate, false positive rate and approval rate equal precision_score, recall_score and the counts', worst < 1e-12, 'max diff ' + sci(worst));
}
{
  // the binomial sampler against scipy.stats.binom.pmf: chi-square goodness of fit on 60,000 draws
  let allOk = true, detail = [];
  for (const c of ref.binom_pmf) {
    const N = 60000, rng = ML.rng(c.n * 7 + 1), cnt = new Array(c.n + 1).fill(0); for (let i = 0; i < N; i++) cnt[ML.binomial(c.n, c.p, rng)]++;
    let chi = 0, df = -1, accO = 0, accE = 0; for (let k = 0; k <= c.n; k++) { accO += cnt[k]; accE += c.pmf[k] * N; if (accE >= 8) { chi += (accO - accE) ** 2 / accE; df++; accO = 0; accE = 0; } }
    chi += accE > 0 ? (accO - accE) ** 2 / accE : 0; const p = ML.chi2Sf(chi, Math.max(1, df)); detail.push('n=' + c.n + ',p=' + c.p + ': p-value ' + p.toFixed(2)); allOk = allOk && p > 0.001;
  }
  ok('binomial sampler matches scipy.stats.binom.pmf (chi-square goodness of fit, 3 settings)', allOk, detail.join('; '));
}

/* ---------------- property tests ---------------- */
const f = (v, d) => v.toFixed(d == null ? 3 : d), mean = ML.mean;
{
  // the fast ridge-logistic fitter used by the A/A comparison has the same optimum as ML.logreg
  const d = ML.loanData(240, ML.rng(3)), sc = ML.scaler(d.X, true), Z = sc.transform(d.X); let worst = 0;
  for (const C of [1, 0.5, 0.1]) { const a = ML.logreg(Z, d.y, { C }), b = ML.logisticFit(Z, d.y, C), wa = Array.from(a.w).concat([a.b]); worst = Math.max(worst, ...wa.map((v, i) => Math.abs(v - b.w[i]))); }
  ok('fast ridge-logistic fit equals ML.logreg (C = 1, 0.5, 0.1)', worst < 1e-8, 'max diff ' + sci(worst));
}
{
  // calibration maps never decrease; isotonic keeps the mean of the labels
  const [tr, cal] = ML.loanSplit([800, 600], ML.rng(8)), sc = ML.fitScorer('nb', tr.X, tr.y), s = sc.eval(cal.X).score();
  const pl = ML.plattFit(s, cal.y), iso = ML.isotonicFit(s, cal.y); const grid = Array.from({ length: 400 }, (_, i) => -30 + 60 * i / 399);
  const mono = (fn) => grid.every((v, i) => i === 0 || fn(v) >= fn(grid[i - 1]) - 1e-15);
  ok('Platt map is increasing (slope > 0) and isotonic map never decreases, over a wide grid of scores', pl.a > 0 && mono(pl.apply) && mono(iso.apply), 'Platt slope ' + f(pl.a, 2));
  const fit = ML.isotonicFit(s, cal.y).applyMany(s); ok('isotonic regression preserves the average of the labels', Math.abs(mean(fit) - mean(Array.from(cal.y))) < 0.01, f(mean(fit), 4) + ' vs ' + f(mean(Array.from(cal.y)), 4));
}
{
  // both calibrators lower the Brier score of an over-confident model (naive Bayes), averaged over 12 datasets
  const raw = [], pl = [], is = [], eceRaw = [], ecePl = [], eceIs = [];
  for (let s = 1; s <= 12; s++) {
    const [tr, cal, te] = ML.loanSplit([800, 1000, 3000], ML.rng(s * 211 + 5)), sc = ML.fitScorer('nb', tr.X, tr.y), vt = sc.eval(te.X), vc = sc.eval(cal.X), st = vt.score(), p0 = vt.prob();
    const a = ML.plattFit(vc.score(), cal.y).applyMany(st), b = ML.isotonicFit(vc.score(), cal.y).applyMany(st);
    raw.push(ML.brier(p0, te.y)); pl.push(ML.brier(a, te.y)); is.push(ML.brier(b, te.y)); eceRaw.push(ML.reliability(p0, te.y, 10).ece); ecePl.push(ML.reliability(a, te.y, 10).ece); eceIs.push(ML.reliability(b, te.y, 10).ece);
  }
  ok('over-confident model (naive Bayes): Platt scaling and isotonic regression both lower the Brier score and the calibration error', mean(pl) < mean(raw) - 0.01 && mean(is) < mean(raw) - 0.01 && mean(ecePl) < 0.6 * mean(eceRaw) && mean(eceIs) < 0.6 * mean(eceRaw), 'Brier ' + f(mean(raw)) + ' to ' + f(mean(pl)) + ' (Platt) and ' + f(mean(is)) + ' (isotonic); error ' + f(mean(eceRaw)) + ' to ' + f(mean(ecePl)) + ' and ' + f(mean(eceIs)));
}
{
  // isotonic needs more data than Platt; calibrating on training rows hurts a flexible model; ranking is kept by Platt
  const M = [100, 2000], br = { svm: { pl: [0, 0], is: [0, 0] }, nb: { pl: [0, 0], is: [0, 0] } }; let eceTrain = 0, eceFresh = 0, platAuc = true; const N = 10;
  for (let s = 1; s <= N; s++) for (const kind of ['svm', 'nb']) {
    const [tr, cal, te] = ML.loanSplit([800, 2000, 3000], ML.rng(s * 313 + 1)), sc = ML.fitScorer(kind, tr.X, tr.y), vt = sc.eval(te.X), vc = sc.eval(cal.X), st = vt.score(), scal = vc.score();
    M.forEach((m, j) => { br[kind].pl[j] += ML.brier(ML.plattFit(scal.subarray(0, m), cal.y.subarray(0, m)).applyMany(st), te.y) / N; br[kind].is[j] += ML.brier(ML.isotonicFit(scal.subarray(0, m), cal.y.subarray(0, m)).applyMany(st), te.y) / N; });
    if (kind === 'svm') {
      const str = sc.eval(tr.X).score(); eceTrain += ML.reliability(ML.isotonicFit(str, tr.y).applyMany(st), te.y, 10).ece / N; eceFresh += ML.reliability(ML.isotonicFit(scal.subarray(0, 800), cal.y.subarray(0, 800)).applyMany(st), te.y, 10).ece / N;
      const pl = ML.plattFit(scal.subarray(0, 500), cal.y.subarray(0, 500)); platAuc = platAuc && pl.a > 0 && Math.abs(ML.auc(pl.applyMany(st), te.y) - ML.auc(st, te.y)) < 1e-12;
    }
  }
  ok('with 100 calibration rows isotonic regression has a worse Brier score than Platt scaling (SVM and naive Bayes scores); with 2,000 it is better for the SVM', br.svm.is[0] > br.svm.pl[0] && br.nb.is[0] > br.nb.pl[0] && br.svm.is[1] < br.svm.pl[1], 'SVM 100 rows: Platt ' + f(br.svm.pl[0], 4) + ' isotonic ' + f(br.svm.is[0], 4) + '; 2,000 rows: ' + f(br.svm.pl[1], 4) + ' and ' + f(br.svm.is[1], 4));
  ok('calibrating a flexible model (RBF SVM) on its own training rows is much worse than on fresh rows (isotonic calibration error)', eceTrain > 2 * eceFresh, f(eceTrain) + ' on training rows vs ' + f(eceFresh) + ' on fresh rows');
  ok('Platt scaling with a positive slope leaves the AUC exactly unchanged', platAuc);
}
{
  // reliability measures: calibrated forecasts give a small error and slope 1; the four classifiers lean the way the pages say
  const rng = ML.rng(4), n = 100000, p = new Float64Array(n), y = new Uint8Array(n); for (let i = 0; i < n; i++) { p[i] = Math.pow(rng(), 0.5); y[i] = rng() < p[i] ? 1 : 0; }
  const r = ML.reliability(p, y, 10), v = ML.verdict(r); ok('perfectly calibrated forecasts: error below 0.01, slope within 0.05 of 1, verdict "good"', r.ece < 0.01 && Math.abs(v.slope - 1) < 0.05 && v.code === 'good', 'error ' + f(r.ece, 4) + ', slope ' + f(v.slope, 3));
  const slopes = { logreg: [], nb: [], svm: [], k1: [], k200: [] }; let svmMax = 0; const N = 8;
  for (let s = 1; s <= N; s++) {
    const [tr, te] = ML.loanSplit([800, 3000], ML.rng(s * 7919 + 11)), sl = (kind, k) => { const vw = ML.fitScorer(kind, tr.X, tr.y, { kmax: 300 }).eval(te.X), pp = vw.prob(k); return { sl: ML.verdict(ML.reliability(pp, te.y, 10)).slope, pp }; };
    slopes.logreg.push(sl('logreg').sl); slopes.nb.push(sl('nb').sl); const sv = sl('svm'); slopes.svm.push(sv.sl); svmMax = Math.max(svmMax, ...sv.pp); slopes.k1.push(sl('knn', 1).sl); slopes.k200.push(sl('knn', 200).sl);
  }
  ok('logistic regression is calibrated (mean slope 0.9 to 1.15); naive Bayes and 1-nearest neighbour are over-confident (slopes below 0.8 and 0.4)', mean(slopes.logreg) > 0.9 && mean(slopes.logreg) < 1.15 && mean(slopes.nb) < 0.8 && mean(slopes.k1) < 0.4, 'slopes ' + f(mean(slopes.logreg), 2) + ', ' + f(mean(slopes.nb), 2) + ', ' + f(mean(slopes.k1), 2));
  ok('the SVM through a plain sigmoid and 200-nearest neighbours are under-confident (slopes above 1.2 and 1.4); the SVM never gives more than 0.9', mean(slopes.svm) > 1.2 && mean(slopes.k200) > 1.4 && svmMax < 0.9, 'slopes ' + f(mean(slopes.svm), 2) + ', ' + f(mean(slopes.k200), 2) + '; largest SVM probability ' + f(svmMax, 2));
}
{
  // the loan table: about 20% default, three correlated columns
  const d = ML.loanData(20000, ML.rng(9)), rate = 1 - mean(Array.from(d.y)), col = (j) => d.X.map((r) => r[j]), cor = (a, b) => { const ma = mean(a), mb = mean(b); let sab = 0, sa = 0, sb = 0; a.forEach((v, i) => { sab += (v - ma) * (b[i] - mb); sa += (v - ma) ** 2; sb += (b[i] - mb) ** 2; }); return sab / Math.sqrt(sa * sb); };
  ok('loan table: 19% to 21% of applicants default', rate > 0.19 && rate < 0.21, f(100 * rate, 1) + '%');
  const c01 = cor(col(0), col(1)), c02 = cor(col(0), col(2)); ok('loan table: income, bank balance and savings are strongly correlated (above 0.7)', c01 > 0.7 && c02 > 0.7, f(c01, 2) + ', ' + f(c02, 2));
  const g = ML.loanGroups(20000, ML.rng(10)), rg = [0, 1].map((k) => mean(Array.from(g.y).filter((_, i) => g.g[i] === k))); ok('two-group table: group B is about 40% of rows and repays less often than group A', Math.abs(mean(Array.from(g.g)) - 0.4) < 0.02 && rg[1] < rg[0] - 0.08, 'repay ' + f(rg[0], 3) + ' and ' + f(rg[1], 3));
}
{
  // cost curve: best() agrees with a brute-force search; the best threshold of calibrated probabilities sits near loss / (gain + loss)
  const rng = ML.rng(6), p = Float64Array.from({ length: 200 }, () => Math.round(rng() * 20) / 20), y = Uint8Array.from(p, (v) => (rng() < v ? 1 : 0)), cc = ML.costCurve(p, y), b = cc.best(1000, 9000); let bf = 0; for (const t of new Set(p)) bf = Math.max(bf, 1000 * p.reduce((s, v, i) => s + (v >= t && y[i] ? 1 : 0), 0) - 9000 * p.reduce((s, v, i) => s + (v >= t && !y[i] ? 1 : 0), 0));
  ok('cost curve: best() finds the same profit as a brute-force search over every threshold', b.profit === bf, ML.costThreshold(1000, 9000) + ' formula');
  const big = 1000000, q = Float64Array.from({ length: big }, () => rng()), yy = Uint8Array.from(q, (v) => (rng() < v ? 1 : 0)), cb = ML.costCurve(q, yy);
  ok('calibrated forecasts (true probabilities, 1,000,000 rows): the best threshold is within 0.01 of loss / (gain + loss) for three cost ratios', [[1000, 9000], [1000, 3000], [1000, 1000]].every(([g1, l1]) => Math.abs(cb.best(g1, l1).t - l1 / (g1 + l1)) < 0.01), [[1000, 9000], [1000, 3000], [1000, 1000]].map(([g1, l1]) => f(cb.best(g1, l1).t, 3) + ' vs ' + f(l1 / (g1 + l1), 2)).join(', '));
  const lr = [], nbT = [], lrR = [], nbR = []; for (let s = 0; s < 20; s++) { const [tr, te] = ML.loanSplit([800, 3000], ML.rng((1300 + s) * 4241 + 3)); for (const [kind, ts, rs] of [['logreg', lr, lrR], ['nb', nbT, nbR]]) { const c2 = ML.costCurve(ML.fitScorer(kind, tr.X, tr.y).eval(te.X).prob(), te.y), bb = c2.best(1000, 9000); ts.push(bb.t); rs.push(c2.at(0.9, 1000, 9000).profit / bb.profit); } }
  ok('logistic regression on loan data: the best threshold averages 0.87 to 0.93 over 20 datasets; naive Bayes needs a higher one (above 0.93), and the formula earns under 90% of its best profit', mean(lr) > 0.87 && mean(lr) < 0.93 && mean(nbT) > 0.93 && mean(nbR) < 0.9 && mean(lrR) > 0.9, 'logistic ' + f(mean(lr), 3) + ' (formula earns ' + f(100 * mean(lrR), 0) + '%), naive Bayes ' + f(mean(nbT), 3) + ' (' + f(100 * mean(nbR), 0) + '%)');
}
{
  // the gap between two independently scored models matches the normal approximation
  const n = 1000, a1 = 0.85, a2 = 0.86, rng = ML.rng(12), N = 20000, g = []; for (let i = 0; i < N; i++) g.push(ML.binomial(n, a2, rng) - ML.binomial(n, a1, rng));
  const sd = Math.sqrt(a1 * (1 - a1) / n + a2 * (1 - a2) / n) * n, m = mean(g), worse = g.filter((v) => v < 0).length / N, theory = ML.normCdf((-0.5 - (a2 - a1) * n) / sd);
  ok('score gap of two independent test sets: mean, standard deviation and the share of reversed comparisons match theory', Math.abs(m - (a2 - a1) * n) < 0.2 && Math.abs(ML.stats(g).sd / sd - 1) < 0.03 && Math.abs(worse - theory) < 0.012, 'sd ' + f(ML.stats(g).sd / n * 100, 3) + ' vs ' + f(sd / n * 100, 3) + ' points; reversed ' + f(100 * worse, 1) + '% vs ' + f(100 * theory, 1) + '%');
  // two equally good models: about 1 time in 20 the gap is beyond 1.96 sd (3.1 points at n = 1000)
  const g0 = []; for (let i = 0; i < N; i++) g0.push((ML.binomial(n, 0.85, rng) - ML.binomial(n, 0.85, rng)) / n * 100); const sd0 = Math.sqrt(2 * 0.85 * 0.15 / n) * 100, out = g0.filter((v) => Math.abs(v) >= 1.96 * sd0).length / N;
  ok('two equally good models (85%, 1,000 rows each): a gap of 3.1 points or more happens about 1 time in 20', out > 0.035 && out < 0.065, f(100 * out, 1) + '% beyond ' + f(1.96 * sd0, 2) + ' points');
}
{
  // McNemar's exact test never exceeds its level; the paired bootstrap interval covers the true difference about 95% of the time
  const rng = ML.rng(21); let rej = 0, N = 30000; for (let i = 0; i < N; i++) { const m = 30 + (i % 40), b = ML.binomial(m, 0.5, rng); if (ML.mcnemarExact(b, m - b) < 0.05) rej++; }
  ok('exact McNemar test under no difference rejects at most 5% of the time (it is conservative)', rej / N <= 0.05 && rej / N > 0.02, f(100 * rej / N, 2) + '% of ' + N);
  const n = 500, pb = 0.08, pc = 0.05, T = 400; let cover = 0; for (let t = 0; t < T; t++) { const a = new Uint8Array(n), bb = new Uint8Array(n); for (let i = 0; i < n; i++) { const u = rng(); if (u < pb) { a[i] = 1; bb[i] = 0; } else if (u < pb + pc) { a[i] = 0; bb[i] = 1; } else { a[i] = bb[i] = rng() < 0.85 ? 1 : 0; } } const ci = ML.percentileCI(ML.bootstrapDiff(a, bb, 400, rng, true), 0.95); if (ci[0] <= pb - pc && ci[1] >= pb - pc) cover++; }
  ok('paired bootstrap 95% interval covers the true accuracy difference in 91% to 98% of 400 test sets', cover / T > 0.91 && cover / T < 0.98, f(100 * cover / T, 1) + '%');
  const ci = [], cu = []; for (let t = 0; t < 200; t++) { const a = new Uint8Array(400), bb = new Uint8Array(400); for (let i = 0; i < 400; i++) { a[i] = rng() < 0.85 ? 1 : 0; bb[i] = rng() < 0.86 ? 1 : 0; } const c = ML.percentileCI(ML.bootstrapDiff(bb, a, 300, rng, false), 0.95); ci.push(c[1] - c[0]); cu.push(c[0] <= 0.01 && c[1] >= 0.01 ? 1 : 0); }
  ok('unpaired bootstrap interval (independent test sets) has about the normal-theory width and covers the true gap in 91% to 98% of 200 draws', Math.abs(mean(ci) / (2 * 1.96 * Math.sqrt(0.85 * 0.15 / 400 + 0.86 * 0.14 / 400)) - 1) < 0.08 && mean(cu) > 0.91 && mean(cu) < 0.985, 'width ' + f(mean(ci) * 100, 2) + ' points, coverage ' + f(100 * mean(cu), 1) + '%');
}
{
  // the A/A comparison: the naive paired t-test over repeated CV folds raises far more false alarms than the corrected test, and more repeats make it worse
  const rate = (K, R, N) => { let fn = 0, fc = 0, md = []; for (let i = 0; i < N; i++) { const r = ML.aaComparison(100003 + i, { n: 300, K, R, cA: 1, cB: 0.1 }); if (r.naive.p < 0.05) fn++; if (r.corrected.p < 0.05) fc++; md.push(mean(r.d)); } return { fn: fn / N, fc: fc / N, md: mean(md), se: ML.stats(md).sd / Math.sqrt(N) }; };
  const r1 = rate(5, 1, 300), r5 = rate(5, 5, 300);
  ok('A/A comparison, 5 folds x 5 repeats, 300 fresh datasets: the naive t-test cries wolf on over 12%, the corrected test on at most 6% (it is conservative here)', r5.fn > 0.12 && r5.fc <= 0.06, 'naive ' + f(100 * r5.fn, 1) + '%, corrected ' + f(100 * r5.fc, 1) + '%');
  ok('A/A comparison: more repeats of K-fold raise the naive false-alarm rate (1 repeat below 8%, 5 repeats more than 8 points higher)', r1.fn < 0.08 && r5.fn > r1.fn + 0.08, 'naive ' + f(100 * r1.fn, 1) + '% with 1 repeat, ' + f(100 * r5.fn, 1) + '% with 5');
  ok('A/A comparison: the two models really are equally good (average accuracy difference within 0.15 points of zero)', Math.abs(r5.md) < 0.0015, f(100 * r5.md, 3) + ' points, standard error ' + f(100 * r5.se, 3));
}
{
  // groups: moving group B\'s threshold until its approval rate equals group A\'s does equalise approval, and moves the other measures
  const rng = ML.rng(5 * 17 + 1), tr = ML.loanGroups(2000, rng), te = ML.loanGroups(6000, rng), p = ML.fitScorer('logreg', tr.X, tr.y).eval(te.X).prob();
  const A = ML.groupMetrics(p, te.y, te.g, [0.8, 0.8], 1000, 9000).groups[0], tb = ML.matchThreshold(p, te.y, te.g, 1, 'approval', A.approval), m = ML.groupMetrics(p, te.y, te.g, [0.8, tb], 1000, 9000);
  ok('matching approval rates: B\'s approval rate is within 1 point of A\'s, and B\'s defaulters approved and precision move away from A\'s', Math.abs(m.groups[1].approval - m.groups[0].approval) < 0.01 && m.groups[1].fpr > m.groups[0].fpr + 0.03 && m.groups[1].precision < m.groups[0].precision - 0.03, 'approval ' + f(m.groups[0].approval, 3) + ' and ' + f(m.groups[1].approval, 3) + '; FPR ' + f(m.groups[0].fpr, 3) + ' and ' + f(m.groups[1].fpr, 3));
}

process.exit(fails ? 1 : 0);
