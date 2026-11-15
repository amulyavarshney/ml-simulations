// node tests/test-eval.js : checks ml-eval.js (fold schemes, AUC, f_classif, k-NN, nested CV, TPE, generators) against scikit-learn and by property
global.self = global; const ML = require('../assets/ml-eval.js'); const ref = require('./reference_eval.json');
let fails = 0; const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); if (!cond) fails++; };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sortedTests = (splits) => splits.map((s) => s.test.slice().sort((a, b) => a - b));
const maxdiff = (a, b) => Math.max(...Array.from(a).map((v, i) => Math.abs(v - b[i])));

/* ---- fold schemes identical to scikit-learn ---- */
ok('KFold (no shuffle): same folds as scikit-learn, ' + ref.kfold.length + ' cases', ref.kfold.every((c) => same(sortedTests(ML.kFold(c.n, c.k)), c.tests)));
ok('StratifiedKFold (no shuffle): same folds, ' + ref.stratified.length + ' cases (imbalanced, balanced, 3 classes)', ref.stratified.every((c) => same(sortedTests(ML.stratKFold(c.y, c.k)), c.tests)));
ok('GroupKFold (no shuffle): same folds, ' + ref.group.length + ' cases', ref.group.every((c) => same(sortedTests(ML.groupKFold(c.groups, c.k)), c.tests)));
ok('TimeSeriesSplit: same train and test indices, ' + ref.timeseries.length + ' cases (default, test_size, gap, max_train_size)', ref.timeseries.every((c) => { const s = ML.timeSeriesSplit(c.n, c.k, c.opts); return same(s.map((x) => ({ train: x.train, test: x.test })), c.pairs); }));

/* ---- every scheme: folds partition the rows, no overlap between train and test ---- */
{
  const rng = ML.rng(5), n = 97, y = Array.from({ length: n }, () => (rng() < 0.2 ? 1 : 0)), g = Array.from({ length: n }, () => rng.int(14));
  const schemes = { kFold: ML.kFold(n, 5, ML.rng(1)), stratified: ML.stratKFold(y, 5, ML.rng(2)), group: ML.groupKFold(g, 5), kfoldPlain: ML.kFold(n, 6) };
  const good = (sp) => { const seen = new Uint8Array(n); let overlap = false; for (const s of sp) { const tr = new Set(s.train); for (const i of s.test) { seen[i]++; if (tr.has(i)) overlap = true; } if (s.train.length + s.test.length !== n) overlap = true; } return !overlap && seen.every((v) => v === 1); };
  ok('shuffled K-fold, stratified, group and plain K-fold: each row is tested exactly once, never in its own training set', Object.values(schemes).every(good));
  const ts = ML.timeSeriesSplit(n, 5); ok('TimeSeriesSplit: no overlap, test blocks are later than the training rows', ts.every((s) => Math.max(...s.train) < Math.min(...s.test)) && ts.every((s) => !s.train.some((i) => s.test.includes(i))));
  const dg = ML.foldDiagnostics(schemes.group, { y, groups: g }), dk = ML.foldDiagnostics(schemes.kFold, { y, groups: g }), dt = ML.foldDiagnostics(ts, { y }), dtk = ML.foldDiagnostics(ML.kFold(n, 5, ML.rng(3)), { y });
  ok('diagnostics: group K-fold puts no group on both sides; shuffled K-fold does', dg.every((d) => d.groupsBoth === 0) && dk.some((d) => d.groupsBoth > 0), 'shuffled: ' + dk.map((d) => d.groupsBoth).join(','));
  ok('diagnostics: time-series folds never test earlier rows than they train on; shuffled K-fold does', dt.every((d) => d.earlier === 0) && dtk.every((d) => d.earlier > 0));
  const sp = ML.stratKFold(y, 5, ML.rng(9)).map((s) => s.test.filter((i) => y[i]).length), tot = y.reduce((a, b) => a + b, 0);
  ok('stratified folds: positives per fold differ by at most one', Math.max(...sp) - Math.min(...sp) <= 1 && sp.reduce((a, b) => a + b, 0) === tot, sp.join(','));
}

/* ---- AUC and ROC ---- */
ok('rank AUC equals roc_auc_score on ' + ref.auc.length + ' cases (continuous, tied scores, perfect, reversed)', ref.auc.every((c) => Math.abs(ML.auc(c.s, c.y) - c.auc) < 1e-12), 'max diff ' + Math.max(...ref.auc.map((c) => Math.abs(ML.auc(c.s, c.y) - c.auc))).toExponential(1));
{
  const r = ref.roc, pts = ML.rocCurve(r.s, r.y);
  ok('ROC curve equals roc_curve (all thresholds kept)', pts.length === r.fpr.length && maxdiff(pts.map((p) => p[0]), r.fpr) < 1e-12 && maxdiff(pts.map((p) => p[1]), r.tpr) < 1e-12);
  let area = 0; for (let i = 1; i < pts.length; i++) area += (pts[i][0] - pts[i - 1][0]) * (pts[i][1] + pts[i - 1][1]) / 2;
  ok('area under the ROC curve equals the rank AUC', Math.abs(area - ML.auc(r.s, r.y)) < 1e-12);
}

/* ---- univariate F selection ---- */
{
  let worst = 0, sel = true, sub = 0;
  for (const c of ref.fclassif) {
    const F = ML.fClassif(c.X, c.y); worst = Math.max(worst, ...Array.from(F).map((v, i) => Math.abs(v - c.F[i]) / Math.max(1, c.F[i])));
    sel = sel && same(ML.topK(F, c.k).sort((a, b) => a - b), c.selected);
    sub = Math.max(sub, ...Array.from(ML.fClassif(c.X, c.y, c.rows)).map((v, i) => Math.abs(v - c.Fsub[i]) / Math.max(1, c.Fsub[i])));
  }
  ok('f_classif: F statistics equal scikit-learn (2 and 3 classes)', worst < 1e-9, 'max relative diff ' + worst.toExponential(1));
  ok('f_classif on a row subset (fold training rows) equals scikit-learn on that subset', sub < 1e-9);
  ok('SelectKBest(f_classif): the same columns are selected', sel);
}

/* ---- classifiers ---- */
{
  const c = ref.centroid, rows = c.X.map((_, i) => i), m = ML.nearestCentroid(c.X, c.y, rows), m2 = ML.nearestCentroid(c.X, c.y, rows, c.cols);
  ok('nearest centroid: predictions equal NearestCentroid (all columns, and a column subset)', same(c.Xt.map((x) => m.predict(x)), c.pred) && same(c.Xt.map((x) => m2.predict(x)), c.pred_cols));
  const kk = ref.knn; ok('k-NN: predictions equal KNeighborsClassifier (uniform and distance weights, p = 1 and 2)', kk.cases.every((cs) => same(ML.knnPredict(kk.X, kk.y, kk.Xt, cs), cs.pred)));
  const g = ref.knngrid, cfgs = g.cases.map((cs) => ({ k: cs.k, weights: cs.weights, p: cs.p })), sc = ML.knnGrid(kk.X, kk.y, cfgs).scoreAll(g.train, g.test);
  ok('fast k-NN grid: accuracies equal KNeighborsClassifier for six settings', maxdiff(sc, g.cases.map((cs) => cs.acc)) < 1e-12, Array.from(sc).map((v) => v.toFixed(3)).join(' '));
}

/* ---- selection inside the folds vs on all rows (noise features, coin-flip labels) ---- */
{
  const rng = ML.rng(11), n = 100, p = 2000, k = 20, wrong = [], right = [];
  for (let r = 0; r < 20; r++) {
    const d = ML.noiseData(n, p, rng), folds = ML.stratKFold(d.y, 5, rng), colsAll = ML.topK(ML.fClassif(d.X, d.y), k); let w = 0, rt = 0;
    for (const f of folds) { w += f.test.filter((i) => ML.nearestCentroid(d.X, d.y, f.train, colsAll).predict(d.X[i]) === d.y[i]).length; const cols = ML.topK(ML.fClassif(d.X, d.y, f.train), k), m = ML.nearestCentroid(d.X, d.y, f.train, cols); rt += f.test.filter((i) => m.predict(d.X[i]) === d.y[i]).length; }
    wrong.push(w / n); right.push(rt / n);
  }
  const W = ML.stats(wrong), R = ML.stats(right);
  ok('noise data: selecting inside each training fold stays near 50%', Math.abs(R.mean - 0.5) < 0.03, 'mean ' + (100 * R.mean).toFixed(1) + '%');
  ok('noise data: selecting on all rows first climbs far above 50%', W.mean > 0.75, 'mean ' + (100 * W.mean).toFixed(1) + '%');
}

/* ---- nested CV: the fast k-NN path equals the generic path; the nested estimate is below the best CV score on noise ---- */
{
  const configs = []; for (let k = 1; k <= 9; k += 2) for (const w of ['uniform', 'distance']) for (const p of [2, 1]) configs.push({ k, weights: w, p });
  const d = ML.signalData(60, 4, 1, ML.rng(3)), X = d.X, y = d.y, grid = ML.knnGrid(X, y, configs);
  const slow = (train, test) => Float64Array.from(configs, (cf) => { const pr = ML.knnPredict(train.map((i) => X[i]), train.map((i) => y[i]), test.map((i) => X[i]), cf); return pr.filter((v, q) => v === y[test[q]]).length / test.length; });
  const mk = (sa) => { const rng = ML.rng(4), outer = ML.stratKFold(y, 5, rng); return ML.nestedTables(sa, outer, (tr) => ML.subSplits(tr, ML.stratKFold(tr.map((i) => y[i]), 3, rng))); };
  const A = mk(grid.scoreAll), B = mk(slow);
  ok('nested tables from the fast k-NN grid equal those from plain k-NN fits', A.outer.every((o, f) => maxdiff(o, B.outer[f]) < 1e-12) && A.inner.every((o, f) => maxdiff(o, B.inner[f]) < 1e-12));
  const P = ML.nestedPick(A, configs.length); ok('nestedPick: best CV is the largest mean outer score', Math.abs(P.best - Math.max(...configs.map((_, c) => A.outer.reduce((s, o) => s + o[c], 0) / 5))) < 1e-12);
  const best = [], nest = [], cfg60 = []; for (let k = 1; k <= 29; k += 2) for (const w of ['uniform', 'distance']) for (const p of [2, 1]) cfg60.push({ k, weights: w, p });
  for (let s = 0; s < 30; s++) {
    const rng = ML.rng(100 + s), dd = ML.signalData(60, 4, 0, rng), gr = ML.knnGrid(dd.X, dd.y, cfg60), outer = ML.stratKFold(dd.y, 5, rng);
    const T = ML.nestedTables(gr.scoreAll, outer, (tr) => ML.subSplits(tr, ML.stratKFold(tr.map((i) => dd.y[i]), 3, rng))), pk = ML.nestedPick(T, 60); best.push(pk.best); nest.push(pk.nested);
  }
  ok('no signal, 60 settings: best CV score is well above 50% but the nested estimate is not', ML.mean(best) > 0.55 && ML.mean(best) - ML.mean(nest) > 0.04 && Math.abs(ML.mean(nest) - 0.5) < 0.04, 'best ' + (100 * ML.mean(best)).toFixed(1) + '%, nested ' + (100 * ML.mean(nest)).toFixed(1) + '%');
}

/* ---- TPE ---- */
{
  const f = (u) => Math.exp(-((u[0] - 0.72) ** 2 + (u[1] - 0.28) ** 2) / (2 * 0.07 ** 2)); let inside = true; const B = 30, R = [], T = [];
  for (let s = 0; s < 300; s++) {
    const rr = ML.rng(s + 1), rt = ML.rng(s + 1); let br = 0, bt = 0; const hist = [];
    for (let t = 0; t < B; t++) { br = Math.max(br, f([rr(), rr()])); const x = ML.tpeSuggest(hist, 2, rt, { startup: 5 }); if (x.some((v) => !(v >= 0 && v <= 1))) inside = false; const v = f(x); hist.push({ x, score: v }); bt = Math.max(bt, v); }
    R.push(br); T.push(bt);
  }
  ok('TPE suggestions stay inside the search box', inside);
  ok('TPE beats random search on a smooth test function (30 trials, 300 runs)', ML.mean(T) > ML.mean(R) + 0.02, 'best found: TPE ' + ML.mean(T).toFixed(3) + ' vs random ' + ML.mean(R).toFixed(3));
}

/* ---- generators ---- */
{
  const rows = ML.churnData(6000, ML.rng(3)), y = rows.map((r) => r.churn), rate = ML.mean(y);
  ok('churn table: churn rate between 20% and 27%', rate > 0.2 && rate < 0.27, (100 * rate).toFixed(1) + '%');
  const aucOf = (ids, live) => { const X = ML.churnMatrix(rows, ids, live), folds = ML.stratKFold(y, 5, ML.rng(1)); return ML.mean(folds.map((f) => { const sc = ML.scaler(f.train.map((i) => X[i]), true), lr = ML.logreg(sc.transform(f.train.map((i) => X[i])), f.train.map((i) => y[i]), { C: 1 }); return ML.auc(f.test.map((i) => lr.decision(sc.apply(X[i]))), f.test.map((i) => y[i])); })); };
  const honest = ['tenure', 'monthly', 'calls', 'm2m', 'drop'], all = honest.concat(['survey', 'refund', 'login']);
  const aH = aucOf(honest, false), aA = aucOf(all, false);
  ok('churn table: honest columns give AUC 0.72 to 0.78', aH > 0.72 && aH < 0.78, aH.toFixed(3));
  ok('churn table: with the three leaky columns the offline AUC is above 0.98', aA > 0.98, aA.toFixed(3));
  const sv = ML.auc(rows.map((r) => r.surveyPost), y); ok('churn table: cancellation_survey_sent alone has AUC between 0.92 and 0.97', sv > 0.92 && sv < 0.97, sv.toFixed(3));
  const c = ML.customers(30, 6, 0, ML.rng(2)); ok('customers: 30 customers x 6 rows, label fixed within a customer', c.X.length === 180 && new Set(c.group).size === 30 && c.group.every((g, i) => c.y[i] === c.y[c.group.indexOf(g)]));
}
process.exit(fails ? 1 : 0);
