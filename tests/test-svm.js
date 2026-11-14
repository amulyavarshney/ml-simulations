// node tests/test-svm.js : checks ml-svm.js (SMO solver, logistic regression, softmax) against scikit-learn
global.self = global; require('../assets/data/wine.js'); const ML = require('../assets/ml-svm.js'); const ref = require('./reference_svm.json');
let fails = 0; const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); if (!cond) fails++; };
const md = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
for (const name of ['rbf', 'rbf_bigC', 'poly2', 'linear']) {
  const r = ref['svc_' + name], m = ML.svc(r.X, r.y, Object.assign({ tol: 1e-4 }, r.kw, { kernel: r.kw.kernel }));
  const dec = r.T.map(t => m.decision(t)); const d = md(dec, r.dec);
  ok('SVC ' + name + ': decision function', d < 2e-3 * Math.max(1, ...r.dec.map(Math.abs)), 'max diff ' + d.toExponential(2) + ', nSV ' + m.nSV + ' vs ' + r.nsv + ', iter ' + m.iter);
  ok('SVC ' + name + ': support-vector count and intercept', m.nSV === r.nsv && Math.abs(-m.rho - r.b) < 2e-3 * Math.max(1, Math.abs(r.b)), 'b ' + (-m.rho).toFixed(4) + ' vs ' + r.b.toFixed(4));
}
for (const name of ['a', 'b']) {
  const r = ref['svr_' + name], X = r.X.map(v => [v]), m = ML.svr(X, r.y, Object.assign({ tol: 1e-4 }, r.kw));
  const d = md(r.T.map(t => m.predict([t])), r.pred);
  ok('SVR ' + name + ': predictions', d < 2e-3, 'max diff ' + d.toExponential(2) + ', nSV ' + m.nSV + ' vs ' + r.nsv);
}
for (const k of ['oc_0.05', 'oc_0.2']) {
  const r = ref[k], m = ML.oneClass(r.X, { gamma: 0.5, nu: r.nu, tol: 1e-4 }); const d = md(r.T.map(t => m.decision(t)), r.dec);
  const fo = r.X.filter(x => m.isOutlier(x)).length / r.X.length;
  ok('one-class ' + k + ': decision function', d < 2e-3, 'max diff ' + d.toExponential(2) + ', nSV ' + m.nSV + ' vs ' + r.nsv + ', outlier fraction ' + fo.toFixed(2) + ' vs ' + r.frac_out.toFixed(2));
}
{ const r = ref.logreg, m = ML.logreg(r.X, r.y, { C: 1 }); const d = Math.max(md(Array.from(m.w), r.w), Math.abs(m.b - r.b)); ok('logistic regression coefficients', d < 1e-5, 'max diff ' + d.toExponential(2)); }
{ // wine pipeline CV, same stratified folds, scaler+PCA fit on training folds only
  const w = ML.data.wine(), folds = ML.stratifiedFolds(w.y, 5); let worst = 0;
  for (const k of Object.keys(ref.wine_cv)) {
    const accs = folds.map(te => { const trI = w.X.map((_, i) => i).filter(i => !te.includes(i)); const Xtr = trI.map(i => w.X[i]), ytr = trI.map(i => w.y[i]);
      const pca = ML.pca(Xtr, { scale: true }), Z = pca.transform(Xtr, +k), lr = ML.softmax(Z, ytr, 3, { C: 1 });
      return te.filter(i => lr.predict(pca.project(w.X[i], +k)) === w.y[i]).length / te.length; });
    const mean = ML.mean(accs), diff = Math.abs(mean - ref.wine_cv[k][0]); worst = Math.max(worst, diff);
    console.log('   k=' + k + ': mean accuracy ' + mean.toFixed(4) + ' vs scikit-learn ' + ref.wine_cv[k][0].toFixed(4));
  }
  ok('wine pipeline CV accuracy per k', worst < 0.012, 'worst diff ' + worst.toFixed(4));
}
process.exit(fails ? 1 : 0);
