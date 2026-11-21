/* ml-decide.js: helpers for calibration, decisions and model comparison: reliability bins, Brier score, log-loss, expected calibration
 * error, Platt scaling (Newton) and isotonic regression (pool adjacent violators), Gaussian naive Bayes, a k-nearest-neighbour vote
 * profile, the made-up loan generators, a profit-against-threshold curve, McNemar's test, bootstrap intervals, Student-t and chi-square
 * distribution functions, the Nadeau-Bengio corrected resampled t-test, and per-group confusion metrics.
 * Needs ml-core.js, ml-svm.js and ml-eval.js (browser) or require('./ml-eval.js') (Node). Compared with scikit-learn and SciPy in tests/test-decide.js. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { const ev = require('./ml-eval.js'); module.exports = Object.assign(ev, factory(ev)); }
  else root.ML = Object.assign(root.ML, factory(root.ML));
})(typeof self !== 'undefined' ? self : this, function (ML) {
  'use strict';
  const out = {};
  const sigmoid = (z) => (z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z)));
  const softplus = (z) => (z > 0 ? z + Math.log1p(Math.exp(-z)) : Math.log1p(Math.exp(z)));
  out.sigmoid = sigmoid;
  out.logit = (p) => Math.log(p / (1 - p));
  const EPS = 2.220446049250313e-16; // scikit-learn clips log-loss probabilities to [eps, 1 - eps]

  /* ================= special functions ================= */
  const LG = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  function lgamma(x) {
    if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x);
    x -= 1; let a = LG[0]; const t = x + 7.5;
    for (let i = 1; i < 9; i++) a += LG[i] / (x + i);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  }
  out.lgamma = lgamma;
  function betacf(a, b, x) { // continued fraction for the incomplete beta function (modified Lentz)
    const TINY = 1e-300, qab = a + b, qap = a + 1, qam = a - 1; let c = 1, d = 1 - qab * x / qap; if (Math.abs(d) < TINY) d = TINY; d = 1 / d; let h = d;
    for (let m = 1; m <= 500; m++) {
      const m2 = 2 * m; let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < TINY) d = TINY; c = 1 + aa / c; if (Math.abs(c) < TINY) c = TINY; d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < TINY) d = TINY; c = 1 + aa / c; if (Math.abs(c) < TINY) c = TINY; d = 1 / d; const del = d * c; h *= del;
      if (Math.abs(del - 1) < 1e-16) break;
    }
    return h;
  }
  /** regularised incomplete beta function I_x(a, b) */
  out.betaInc = function (a, b, x) {
    if (x <= 0) return 0; if (x >= 1) return 1;
    const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log1p(-x));
    return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
  };
  /** upper regularised incomplete gamma function Q(a, x) */
  function gammaQ(a, x) {
    if (x <= 0) return 1;
    const pre = Math.exp(-x + a * Math.log(x) - lgamma(a));
    if (x < a + 1) { let ap = a, sum = 1 / a, del = sum; for (let n = 0; n < 1000; n++) { ap++; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-16) break; } return 1 - sum * pre; }
    const TINY = 1e-300; let b = x + 1 - a, c = 1 / TINY, d = 1 / b, h = d;
    for (let i = 1; i < 1000; i++) { const an = -i * (i - a); b += 2; d = an * d + b; if (Math.abs(d) < TINY) d = TINY; c = b + an / c; if (Math.abs(c) < TINY) c = TINY; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-16) break; }
    return pre * h;
  }
  out.gammaQ = gammaQ;
  /** chi-square survival function P(X > x) with k degrees of freedom */
  out.chi2Sf = (x, k) => (x <= 0 ? 1 : gammaQ(k / 2, x / 2));
  /** two-sided Student-t p-value P(|T| >= |t|) with df degrees of freedom */
  out.tTwoSided = (t, df) => (!isFinite(t) ? 0 : out.betaInc(df / 2, 0.5, df / (df + t * t)));
  /** Student-t cumulative distribution function */
  out.tCdf = function (t, df) { const p = out.tTwoSided(t, df) / 2; return t > 0 ? 1 - p : p; };
  out.normCdf = (z) => (z < 0 ? 0.5 * gammaQ(0.5, z * z / 2) : 1 - 0.5 * gammaQ(0.5, z * z / 2));

  /* ================= scores and reliability ================= */
  out.brier = function (p, y) { let s = 0; for (let i = 0; i < p.length; i++) { const e = p[i] - (y[i] > 0 ? 1 : 0); s += e * e; } return s / p.length; };
  out.logLoss = function (p, y) { let s = 0; for (let i = 0; i < p.length; i++) { const q = Math.min(1 - EPS, Math.max(EPS, p[i])); s -= y[i] > 0 ? Math.log(q) : Math.log(1 - q); } return s / p.length; };
  /** Uniform bins on [0, 1] with scikit-learn's calibration_curve rule (a bin holds lo < p <= hi; the first also holds 0).
   *  Returns {bins: [{i, lo, hi, n, meanP, rate}], n, ece, mce}: rate = share of y = 1, ece = sum of n_b/n * |rate - meanP| over the non-empty bins. */
  out.reliability = function (p, y, nb) {
    const edges = [], step = 1 / nb; for (let i = 1; i < nb; i++) edges.push(i * step);
    const bins = Array.from({ length: nb }, (_, i) => ({ i, lo: i / nb, hi: (i + 1) / nb, n: 0, sumP: 0, sumY: 0 }));
    for (let k = 0; k < p.length; k++) {
      let lo = 0, hi = nb - 1; while (lo < hi) { const mid = (lo + hi) >> 1; if (edges[mid] < p[k]) lo = mid + 1; else hi = mid; }
      const b = bins[lo]; b.n++; b.sumP += p[k]; b.sumY += y[k] > 0 ? 1 : 0;
    }
    let ece = 0, mce = 0; const N = p.length;
    bins.forEach((b) => { b.meanP = b.n ? b.sumP / b.n : NaN; b.rate = b.n ? b.sumY / b.n : NaN; if (b.n) { const g = Math.abs(b.rate - b.meanP); ece += b.n / N * g; if (g > mce) mce = g; } });
    return { bins, n: N, ece, mce };
  };
  /** Slope of the dots of a reliability diagram: weighted least-squares slope of "share that really happened" on "mean forecast" over the non-empty bins.
   *  1 means the dots run parallel to the diagonal; below 1 the forecasts are more extreme than reality (over-confident); above 1 they are too timid (under-confident). */
  out.calibrationSlope = function (rel) {
    let sw = 0, sx = 0, sy = 0; rel.bins.forEach((b) => { if (b.n) { sw += b.n; sx += b.n * b.meanP; sy += b.n * b.rate; } });
    const mx = sx / sw, my = sy / sw; let sxy = 0, sxx = 0; rel.bins.forEach((b) => { if (b.n) { sxy += b.n * (b.meanP - mx) * (b.rate - my); sxx += b.n * (b.meanP - mx) * (b.meanP - mx); } });
    return sxx > 0 ? sxy / sxx : NaN;
  };
  /** Plain-language verdict from the slope and the expected calibration error: {code: 'good' | 'over' | 'under', slope, text}. */
  out.verdict = function (rel) {
    const slope = out.calibrationSlope(rel), dev = Math.abs(slope - 1);
    if (!isFinite(slope)) return { code: 'none', slope, text: 'too few different forecasts to judge' };
    if (dev < 0.15 && rel.ece < 0.04) return { code: 'good', slope, text: 'well calibrated: the dots sit close to the diagonal' };
    const mild = dev < 0.3 && rel.ece < 0.06;
    return slope < 1 ? { code: 'over', slope, text: (mild ? 'slightly ' : '') + 'over-confident: the forecasts are more extreme than what really happens' } : { code: 'under', slope, text: (mild ? 'slightly ' : '') + 'under-confident: the forecasts are too timid, what really happens is more extreme' };
  };

  /* ================= calibrators ================= */
  /** Platt scaling: p = sigmoid(a * score + b), the maximum-likelihood a and b (two parameters, Newton's method with step halving). */
  out.plattFit = function (s, y) {
    const n = s.length; let n1 = 0; for (let i = 0; i < n; i++) if (y[i] > 0) n1++;
    let a = 0, b = Math.log((n1 + 0.5) / (n - n1 + 0.5)), it = 0;
    const nll = (a2, b2) => { let t = 0; for (let i = 0; i < n; i++) { const z = a2 * s[i] + b2; t += softplus(z) - (y[i] > 0 ? z : 0); } return t; };
    let f = nll(a, b);
    for (; it < 100; it++) {
      let g0 = 0, g1 = 0, h00 = 0, h01 = 0, h11 = 0;
      for (let i = 0; i < n; i++) { const p = sigmoid(a * s[i] + b), r = p - (y[i] > 0 ? 1 : 0), w = p * (1 - p); g0 += r * s[i]; g1 += r; h00 += w * s[i] * s[i]; h01 += w * s[i]; h11 += w; }
      const ridge = 1e-12 * (h00 + h11) + 1e-300; h00 += ridge; h11 += ridge; const det = h00 * h11 - h01 * h01; if (!(det > 0)) break;
      const da = (h11 * g0 - h01 * g1) / det, db = (-h01 * g0 + h00 * g1) / det; let t = 1, moved = false;
      for (let k = 0; k < 40; k++) { const f2 = nll(a - t * da, b - t * db); if (f2 <= f - 1e-4 * t * (g0 * da + g1 * db) + 1e-15) { a -= t * da; b -= t * db; f = f2; moved = true; break; } t /= 2; }
      if (!moved || Math.max(Math.abs(t * da), Math.abs(t * db)) < 1e-12 || Math.abs(a) > 1e4) break;
    }
    return { kind: 'platt', a, b, iter: it, apply: (v) => sigmoid(a * v + b), applyMany: (arr) => Float64Array.from(arr, (v) => sigmoid(a * v + b)) };
  };
  /** Isotonic regression of y on x by pool adjacent violators, built like scikit-learn's IsotonicRegression (increasing, ties merged,
   *  only the ends of each flat stretch kept, linear interpolation between them, clipped outside the range of x). w: optional weights. */
  out.isotonicFit = function (x, y, w) {
    const n = x.length, idx = Array.from({ length: n }, (_, i) => i).sort((p, q) => x[p] - x[q]), ux = [], uy = [], uw = [];
    for (let i = 0; i < n;) { let j = i, sw = 0, swy = 0; while (j < n && x[idx[j]] === x[idx[i]]) { const wi = w ? w[idx[j]] : 1; sw += wi; swy += wi * (y[idx[j]]); j++; } ux.push(x[idx[i]]); uy.push(swy / sw); uw.push(sw); i = j; }
    const bv = [], bw = [], bc = [];
    for (let i = 0; i < ux.length; i++) {
      bv.push(uy[i]); bw.push(uw[i]); bc.push(1);
      while (bv.length > 1 && bv[bv.length - 2] >= bv[bv.length - 1]) {
        const l = bv.length, nw = bw[l - 2] + bw[l - 1], nv = (bv[l - 2] * bw[l - 2] + bv[l - 1] * bw[l - 1]) / nw, nc = bc[l - 2] + bc[l - 1];
        bv.length = bw.length = bc.length = l - 2; bv.push(nv); bw.push(nw); bc.push(nc);
      }
    }
    const fy = []; bv.forEach((v, k) => { for (let c = 0; c < bc[k]; c++) fy.push(v); });
    const X = [], Y = []; for (let i = 0; i < fy.length; i++) if (i === 0 || i === fy.length - 1 || fy[i] !== fy[i - 1] || fy[i] !== fy[i + 1]) { X.push(ux[i]); Y.push(fy[i]); }
    const m = X.length;
    const apply = (v) => {
      if (m === 1) return Y[0]; if (v <= X[0]) return Y[0]; if (v >= X[m - 1]) return Y[m - 1];
      let lo = 0, hi = m - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (X[mid] <= v) lo = mid; else hi = mid; }
      return Y[lo] + (Y[hi] - Y[lo]) * (v - X[lo]) / (X[hi] - X[lo]);
    };
    return { kind: 'isotonic', X, Y, levels: new Set(fy).size, apply, applyMany: (arr) => Float64Array.from(arr, apply) };
  };

  /* ================= classifiers ================= */
  /** Gaussian naive Bayes as scikit-learn (variance smoothing 1e-9 times the largest feature variance). y in {0, 1}. */
  out.gnbFit = function (X, y) {
    const n = X.length, d = X[0].length, cnt = [0, 0], mean = [new Float64Array(d), new Float64Array(d)], vr = [new Float64Array(d), new Float64Array(d)];
    const all = ML.colMeans(X), tv = new Float64Array(d); for (const r of X) for (let j = 0; j < d; j++) tv[j] += (r[j] - all[j]) * (r[j] - all[j]);
    const eps = 1e-9 * Math.max(...Array.from(tv, (v) => v / n));
    for (let i = 0; i < n; i++) { const c = y[i] > 0 ? 1 : 0; cnt[c]++; for (let j = 0; j < d; j++) mean[c][j] += X[i][j]; }
    for (let c = 0; c < 2; c++) for (let j = 0; j < d; j++) mean[c][j] /= cnt[c];
    for (let i = 0; i < n; i++) { const c = y[i] > 0 ? 1 : 0; for (let j = 0; j < d; j++) vr[c][j] += (X[i][j] - mean[c][j]) * (X[i][j] - mean[c][j]); }
    for (let c = 0; c < 2; c++) for (let j = 0; j < d; j++) vr[c][j] = vr[c][j] / cnt[c] + eps;
    const lp = [Math.log(cnt[0] / n), Math.log(cnt[1] / n)];
    const logOdds = (x) => { let s1 = lp[1], s0 = lp[0]; for (let j = 0; j < d; j++) { s1 += -0.5 * Math.log(2 * Math.PI * vr[1][j]) - (x[j] - mean[1][j]) ** 2 / (2 * vr[1][j]); s0 += -0.5 * Math.log(2 * Math.PI * vr[0][j]) - (x[j] - mean[0][j]) ** 2 / (2 * vr[0][j]); } return s1 - s0; };
    return { mean, var: vr, prior: [cnt[0] / n, cnt[1] / n], logOdds, prob: (x) => sigmoid(logOdds(x)) };
  };
  /** Vote profile of k nearest neighbours (Euclidean): for every row of Xte the running count of label-1 neighbours among the first 1..kmax.
   *  prob(k) = count / k is KNeighborsClassifier(k).predict_proba. */
  out.knnProfile = function (Xtr, ytr, Xte, kmax) {
    const nt = Xtr.length, d = Xtr[0].length, m = Xte.length, K = Math.min(kmax, nt), cum = new Int16Array(m * K), keys = new Float64Array(nt), SC = 1099511627776; // 2^40: distance resolution 1e-12, one bit holds the label
    for (let t = 0; t < m; t++) {
      const x = Xte[t];
      for (let i = 0; i < nt; i++) { const z = Xtr[i]; let s = 0; for (let j = 0; j < d; j++) { const q = z[j] - x[j]; s += q * q; } keys[i] = Math.floor(Math.sqrt(s) * SC) * 2 + (ytr[i] > 0 ? 1 : 0); }
      keys.sort(); let c = 0; const base = t * K; for (let q = 0; q < K; q++) { c += keys[q] % 2; cum[base + q] = c; }
    }
    return { cum, kmax: K, n: m, prob(k) { k = Math.min(k, K); return Float64Array.from({ length: m }, (_, t) => cum[t * K + k - 1] / k); }, votes(k) { k = Math.min(k, K); return Int16Array.from({ length: m }, (_, t) => cum[t * K + k - 1]); } };
  };

  /** A classifier that turns rows into a real-valued score and a raw probability of repaying.
   *  kind: 'logreg' (score = log-odds), 'nb' (Gaussian naive Bayes log-odds), 'svm' (RBF SVM, gamma 0.5 and C 1; probability = plain sigmoid of its decision value),
   *  'knn' (score = smoothed log-odds of the vote share, probability = vote share; needs opts.k at eval time). Features are standardised on the training rows.
   *  eval(X) -> {score(k?), prob(k?)} (Float64Array). opts: C, gamma, kmax. */
  out.fitScorer = function (kind, Xtr, ytr, opts) {
    opts = opts || {}; const sc = ML.scaler(Xtr, true), Xs = sc.transform(Xtr), ys = Array.from(ytr, (v) => (v > 0 ? 1 : 0));
    const wrap = (scoreFn, probFn) => (X) => { let s = null, p = null; return { score: () => (s = s || scoreFn(X)), prob: () => (p = p || probFn(X, s = s || scoreFn(X))) }; };
    if (kind === 'knn') {
      const kmax = opts.kmax || 200;
      return { kind, kmax, eval(X) { const prof = out.knnProfile(Xs, ys, X.map((x) => sc.apply(x)), kmax); return { score: (k) => { const v = prof.votes(k); return Float64Array.from(v, (c) => Math.log((c + 0.5) / (k - c + 0.5))); }, prob: (k) => prof.prob(k), prof }; } };
    }
    if (kind === 'nb') { const m = out.gnbFit(Xtr, ys); return { kind, model: m, eval: wrap((X) => Float64Array.from(X, (x) => m.logOdds(x)), (X, s) => Float64Array.from(s, sigmoid)) }; }
    if (kind === 'svm') { const m = ML.svc(Xs, ys, { kernel: 'rbf', gamma: opts.gamma || 0.5, C: opts.C || 1, maxMs: opts.maxMs || 4000 }); return { kind, model: m, eval: wrap((X) => Float64Array.from(X, (x) => m.decision(sc.apply(x))), (X, s) => Float64Array.from(s, sigmoid)) }; }
    const m = ML.logreg(Xs, ys, { C: opts.C == null ? 1 : opts.C });
    return { kind: 'logreg', model: m, eval: wrap((X) => Float64Array.from(X, (x) => m.decision(sc.apply(x))), (X, s) => Float64Array.from(s, sigmoid)) };
  };
  /** the scores and raw probabilities of a scorer on X, as plain arrays (k only matters for k-NN) */
  out.scored = function (scorer, X, k) { const v = scorer.eval(X); return { score: v.score(k), prob: v.prob(k) }; };

  /** Ridge logistic regression with the objective of ML.logreg (C * sum of log-losses + 1/2 |w|^2, intercept not penalised), by damped Newton steps,
   *  with an optional warm start. Z: standardised rows, y in {0, 1}. Returns {w (Float64Array of length d + 1, last entry is the intercept), decision(z)}.
   *  Much faster than ML.logreg for the many small fits of the A/A comparison; tests/test-decide.js checks that the two agree. */
  out.logisticFit = function (Z, y, C, w0) {
    const n = Z.length, d = Z[0].length, P = d + 1, w = w0 ? Float64Array.from(w0) : new Float64Array(P), g = new Float64Array(P), H = new Float64Array(P * P), Lc = new Float64Array(P * P), step = new Float64Array(P), w2 = new Float64Array(P);
    const obj = (v) => { let t = 0; for (let i = 0; i < n; i++) { let z = v[d]; const r = Z[i]; for (let j = 0; j < d; j++) z += v[j] * r[j]; t += C * (softplus(z) - (y[i] > 0 ? z : 0)); } for (let j = 0; j < d; j++) t += 0.5 * v[j] * v[j]; return t; };
    let f = obj(w);
    for (let it = 0; it < 60; it++) {
      g.fill(0); H.fill(0); for (let j = 0; j < d; j++) { g[j] = w[j]; H[j * P + j] = 1; }
      for (let i = 0; i < n; i++) {
        const z = Z[i]; let s = w[d]; for (let j = 0; j < d; j++) s += w[j] * z[j];
        const p = sigmoid(s), r = C * (p - (y[i] > 0 ? 1 : 0)), h = C * p * (1 - p);
        for (let a = 0; a < d; a++) { const za = z[a], ha = h * za; g[a] += r * za; for (let b = a; b < d; b++) H[a * P + b] += ha * z[b]; H[a * P + d] += ha; }
        g[d] += r; H[d * P + d] += h;
      }
      for (let a = 0; a < P; a++) { H[a * P + a] += 1e-10; for (let b = 0; b < a; b++) H[a * P + b] = H[b * P + a]; }
      // Cholesky solve H step = g
      let okc = true;
      for (let a = 0; a < P && okc; a++) for (let b = 0; b <= a; b++) { let t = H[a * P + b]; for (let k = 0; k < b; k++) t -= Lc[a * P + k] * Lc[b * P + k]; if (a === b) { if (!(t > 0)) { okc = false; break; } Lc[a * P + a] = Math.sqrt(t); } else Lc[a * P + b] = t / Lc[b * P + b]; }
      if (!okc) break;
      for (let a = 0; a < P; a++) { let t = g[a]; for (let k = 0; k < a; k++) t -= Lc[a * P + k] * step[k]; step[a] = t / Lc[a * P + a]; }
      for (let a = P - 1; a >= 0; a--) { let t = step[a]; for (let k = a + 1; k < P; k++) t -= Lc[k * P + a] * step[k]; step[a] = t / Lc[a * P + a]; }
      let tt = 1, moved = false, gd = 0; for (let a = 0; a < P; a++) gd += g[a] * step[a];
      for (let k = 0; k < 30; k++) { for (let a = 0; a < P; a++) w2[a] = w[a] - tt * step[a]; const f2 = obj(w2); if (f2 <= f - 1e-4 * tt * gd + 1e-13) { w.set(w2); f = f2; moved = true; break; } tt /= 2; }
      let big = 0; for (let a = 0; a < P; a++) big = Math.max(big, Math.abs(tt * step[a]));
      if (!moved || big < 1e-10) break;
    }
    return { w, decision: (z) => { let s = w[d]; for (let j = 0; j < d; j++) s += w[j] * z[j]; return s; } };
  };

  /* ================= made-up loan tables ================= */
  out.LOAN_COLUMNS = [
    { id: 'income', label: 'monthly income' }, { id: 'balance', label: 'average bank balance' }, { id: 'savings', label: 'savings' },
    { id: 'debt', label: 'debt-to-income ratio' }, { id: 'history', label: 'years of credit history' }, { id: 'size', label: 'loan size relative to income' },
  ];
  /** n made-up loan applicants. y = 1 if the loan is repaid, 0 if it defaults (about 20% default with the defaults below).
   *  Three columns (income, bank balance, savings) are noisy copies of one hidden "financial strength", so they are strongly correlated.
   *  o: dS, dD (shift the hidden strength and debt burden), noise (multiplies the measurement noise), b0 (shift of the default log-odds). */
  out.loanData = function (n, rng, o) {
    o = o || {}; const ns = o.noise || 1, X = [], y = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const s = rng.normal() + (o.dS || 0), dbt = rng.normal() + (o.dD || 0), h = rng.normal();
      X.push(Float64Array.of(s + 0.45 * ns * rng.normal(), s + 0.45 * ns * rng.normal(), s + 0.55 * ns * rng.normal(), dbt + 0.35 * ns * rng.normal(), 0.3 * s + h + 0.3 * ns * rng.normal(), 0.5 * dbt - 0.3 * s + 0.8 * ns * rng.normal()));
      const z = -2.05 + (o.b0 || 0) - 1.25 * s + 1.05 * dbt - 0.45 * h; // log-odds of default
      y[i] = rng() < sigmoid(z) ? 0 : 1;
    }
    return { X, y };
  };
  /** Applicants in two groups (0 = group A, 1 = group B, 40% of rows). Group B has a lower average financial strength, more debt, noisier measurements and a lower repay rate. */
  out.loanGroups = function (n, rng) {
    const X = [], y = new Uint8Array(n), g = new Uint8Array(n);
    for (let i = 0; i < n; i++) { const gi = rng() < 0.4 ? 1 : 0, o = gi ? { dS: -0.55, dD: 0.3, noise: 1.35, b0: 0 } : { dS: 0.1, dD: 0, noise: 1 }, d = out.loanData(1, rng, o); X.push(d.X[0]); y[i] = d.y[0]; g[i] = gi; }
    return { X, y, g };
  };
  /** train / calibration / test split sizes drawn in one go so seeds stay stable: returns slices of one table */
  out.loanSplit = function (sizes, rng, o) {
    const total = sizes.reduce((a, b) => a + b, 0), d = out.loanData(total, rng, o), res = []; let at = 0;
    for (const s of sizes) { res.push({ X: d.X.slice(at, at + s), y: d.y.slice(at, at + s) }); at += s; }
    return res;
  };

  /* ================= decisions from costs ================= */
  /** Profit curve for "approve if p >= t": gain per repaid loan approved, loss per default approved, rejecting earns nothing. y = 1 repaid. */
  out.costCurve = function (p, y) {
    const n = p.length, ord = Array.from({ length: n }, (_, i) => i).sort((a, b) => p[b] - p[a]), sp = new Float64Array(n), cr = new Int32Array(n + 1), cd = new Int32Array(n + 1);
    for (let i = 0; i < n; i++) { sp[i] = p[ord[i]]; const rep = y[ord[i]] > 0 ? 1 : 0; cr[i + 1] = cr[i] + rep; cd[i + 1] = cd[i] + 1 - rep; }
    const count = (t) => { let lo = 0, hi = n; while (lo < hi) { const mid = (lo + hi) >> 1; if (sp[mid] >= t) lo = mid + 1; else hi = mid; } return lo; };
    return {
      n, nRepay: cr[n], nDefault: cd[n],
      at(t, gain, loss) { const m = count(t); return { approved: m, repaid: cr[m], defaults: cd[m], profit: gain * cr[m] - loss * cd[m] }; },
      /** the threshold that maximises profit on these rows (midway between the last approved and the first rejected probability) */
      best(gain, loss) {
        let bm = 0, bp = 0;
        for (let m = 1; m <= n; m++) { if (m < n && sp[m - 1] === sp[m]) continue; const pr = gain * cr[m] - loss * cd[m]; if (pr > bp + 1e-9) { bp = pr; bm = m; } }
        const t = bm === 0 ? 1 : bm === n ? sp[n - 1] : (sp[bm - 1] + sp[bm]) / 2;
        return { t, profit: bp, approved: bm, repaid: cr[bm], defaults: cd[bm] };
      },
    };
  };
  out.costThreshold = (gain, loss) => loss / (gain + loss);

  /* ================= comparing models ================= */
  /** exact binomial draw (waiting-time method on the rarer outcome) */
  out.binomial = function (n, p, rng) {
    if (p <= 0) return 0; if (p >= 1) return n;
    const flip = p > 0.5, q = flip ? 1 - p : p, lq = Math.log1p(-q); let x = 0, sum = 0;
    for (;;) { sum += Math.floor(Math.log(rng() || 1e-300) / lq) + 1; if (sum > n) break; x++; }
    return flip ? n - x : x;
  };
  /** exact two-sided McNemar p-value: 2 P(X <= min(b, c)), X ~ Binomial(b + c, 1/2), capped at 1 */
  out.mcnemarExact = function (b, c) {
    const n = b + c; if (n === 0) return 1; const k = Math.min(b, c); if (2 * k === n) return 1;
    return Math.min(1, 2 * out.betaInc(n - k, k + 1, 0.5));
  };
  /** McNemar's chi-square statistic with continuity correction, (|b - c| - 1)^2 / (b + c), and its p-value (1 degree of freedom) */
  out.mcnemarChi2 = function (b, c) {
    const n = b + c; if (n === 0) return { stat: 0, p: 1 }; const a = Math.max(0, Math.abs(b - c) - 1), stat = a * a / n; return { stat, p: out.chi2Sf(stat, 1) };
  };
  /** Bootstrap draws of the difference in accuracy. a, b: 0/1 correctness per row. paired: same rows for both (resampled together); otherwise each has its own rows.
   *  A generator that yields the share done every 100 resamples; sink receives the Float64Array of B differences (mean of a minus mean of b). */
  out.bootstrapDiffGen = function* (a, b, B, rng, paired, sink) {
    const na = a.length, nb = b.length, res = new Float64Array(B);
    if (paired) { const d = new Int8Array(na); for (let i = 0; i < na; i++) d[i] = a[i] - b[i]; for (let r = 0; r < B; r++) { let s = 0; for (let i = 0; i < na; i++) s += d[(rng() * na) | 0]; res[r] = s / na; if (r % 100 === 99) yield (r + 1) / B; } }
    else for (let r = 0; r < B; r++) { let sa = 0, sb = 0; for (let i = 0; i < na; i++) sa += a[(rng() * na) | 0]; for (let i = 0; i < nb; i++) sb += b[(rng() * nb) | 0]; res[r] = sa / na - sb / nb; if (r % 100 === 99) yield (r + 1) / B; }
    sink(res);
  };
  out.bootstrapDiff = function (a, b, B, rng, paired) { let res; for (const _ of out.bootstrapDiffGen(a, b, B, rng, paired, (r) => { res = r; })); return res; };
  /** percentile interval of an array of draws */
  out.percentileCI = function (draws, level) { const q = (1 - (level || 0.95)) / 2; return [ML.quantile(draws, q), ML.quantile(draws, 1 - q)]; };
  /** paired t-test on a list of differences (as scipy.stats.ttest_1samp against 0) */
  out.pairedT = function (d) {
    const n = d.length, m = ML.mean(d); let ss = 0; for (const v of d) ss += (v - m) * (v - m); const sd = Math.sqrt(ss / (n - 1)), df = n - 1;
    if (!(sd > 0)) return { mean: m, sd, t: m === 0 ? 0 : (m > 0 ? Infinity : -Infinity), df, p: m === 0 ? 1 : 0 };
    const t = m / (sd / Math.sqrt(n)); return { mean: m, sd, t, df, p: out.tTwoSided(t, df) };
  };
  /** Nadeau and Bengio's corrected resampled t-test: the variance of the mean difference is s^2 (1/J + n_test/n_train) instead of s^2 / J. */
  out.correctedT = function (d, nTest, nTrain) {
    const J = d.length, m = ML.mean(d); let ss = 0; for (const v of d) ss += (v - m) * (v - m); const s2 = ss / (J - 1), df = J - 1, v = s2 * (1 / J + nTest / nTrain);
    if (!(v > 0)) return { mean: m, t: m === 0 ? 0 : (m > 0 ? Infinity : -Infinity), df, p: m === 0 ? 1 : 0 };
    const t = m / Math.sqrt(v); return { mean: m, t, df, p: out.tTwoSided(t, df) };
  };
  /** One A/A comparison on freshly generated loan data: logistic regression with C = cA against the same model with C = cB, scored by
   *  K-fold cross-validation repeated R times (stratified, reshuffled). Returns the per-fold accuracy differences and both p-values. */
  out.aaComparison = function (seed, o) {
    const n = o.n || 300, K = o.K || 5, R = o.R || 2, cA = o.cA || 1, cB = o.cB || 0.5, rng = ML.rng(seed), data = out.loanData(n, rng, o.loan), d = [], dd = data.X[0].length;
    let nTest = 0, nTrain = 0, flips = 0, tested = 0;
    for (let r = 0; r < R; r++) {
      const folds = ML.stratKFold(data.y, K, rng);
      for (const f of folds) {
        const m = new Float64Array(dd), sd = new Float64Array(dd); for (const i of f.train) for (let j = 0; j < dd; j++) m[j] += data.X[i][j]; for (let j = 0; j < dd; j++) m[j] /= f.train.length;
        for (const i of f.train) for (let j = 0; j < dd; j++) sd[j] += (data.X[i][j] - m[j]) ** 2; for (let j = 0; j < dd; j++) sd[j] = Math.sqrt(sd[j] / f.train.length) || 1;
        const std = (x) => { const z = new Float64Array(dd); for (let j = 0; j < dd; j++) z[j] = (x[j] - m[j]) / sd[j]; return z; };
        const Z = f.train.map((i) => std(data.X[i])), ytr = f.train.map((i) => data.y[i]), A = out.logisticFit(Z, ytr, cA), B = out.logisticFit(Z, ytr, cB, A.w); let ca = 0, cb = 0;
        for (const i of f.test) { const z = std(data.X[i]), pa = A.decision(z) > 0 ? 1 : 0, pb = B.decision(z) > 0 ? 1 : 0, yy = data.y[i]; if (pa === yy) ca++; if (pb === yy) cb++; if (pa !== pb) flips++; tested++; }
        d.push((ca - cb) / f.test.length); nTest += f.test.length; nTrain += f.train.length;
      }
    }
    nTest /= d.length; nTrain /= d.length;
    return { d, nTest, nTrain, naive: out.pairedT(d), corrected: out.correctedT(d, nTest, nTrain), disagree: flips / tested };
  };

  /* ================= metrics by group ================= */
  /** Confusion counts and rates per group for "approve if p >= threshold of the row's group". y = 1 repaid (the positive class); g = group id 0 or 1; thr = [t0, t1]. */
  out.groupMetrics = function (p, y, g, thr, gain, loss) {
    const G = [0, 1].map(() => ({ n: 0, tp: 0, fp: 0, fn: 0, tn: 0 }));
    for (let i = 0; i < p.length; i++) { const c = G[g[i]], ap = p[i] >= thr[g[i]], pos = y[i] > 0; c.n++; if (ap && pos) c.tp++; else if (ap) c.fp++; else if (pos) c.fn++; else c.tn++; }
    const fin = (c) => { const rep = c.tp + c.fn, def = c.fp + c.tn; return Object.assign(c, { repayRate: c.n ? rep / c.n : NaN, approval: c.n ? (c.tp + c.fp) / c.n : NaN, tpr: rep ? c.tp / rep : NaN, fpr: def ? c.fp / def : NaN, precision: c.tp + c.fp ? c.tp / (c.tp + c.fp) : NaN, accuracy: c.n ? (c.tp + c.tn) / c.n : NaN, profit: (gain || 0) * c.tp - (loss || 0) * c.fp }); };
    G.forEach(fin);
    const all = fin({ n: G[0].n + G[1].n, tp: G[0].tp + G[1].tp, fp: G[0].fp + G[1].fp, fn: G[0].fn + G[1].fn, tn: G[0].tn + G[1].tn });
    return { groups: G, all };
  };
  /** the threshold for group `which` whose metric (approval, tpr, fpr or precision) is closest to `target`, searched over the group's own probabilities */
  out.matchThreshold = function (p, y, g, which, metric, target) {
    const vals = []; for (let i = 0; i < p.length; i++) if (g[i] === which) vals.push(p[i]);
    vals.sort((a, b) => a - b); const step = Math.max(1, Math.floor(vals.length / 400)); let best = 0.5, bd = Infinity;
    for (let k = 0; k < vals.length; k += step) {
      const thr = which ? [2, vals[k]] : [vals[k], 2], m = out.groupMetrics(p, y, g, thr, 0, 0).groups[which][metric], dd = Math.abs(m - target);
      if (dd < bd) { bd = dd; best = vals[k]; }
    }
    return best;
  };
  return out;
});
