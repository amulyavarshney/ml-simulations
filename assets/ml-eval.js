/* ml-eval.js: helpers for model evaluation: train/test splits and fold schemes (KFold, StratifiedKFold, GroupKFold,
 * TimeSeriesSplit), rank-based AUC and ROC, univariate F selection, nearest centroid, k-nearest neighbours,
 * nested cross-validation tables, a compact TPE sampler, and the synthetic data generators of the Session 5 pages.
 * Needs ml-core.js and ml-svm.js (browser) or require('./ml-svm.js') (Node). The fold schemes follow scikit-learn's
 * rules exactly where they are deterministic (see tests/test-eval.js). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { const svm = require('./ml-svm.js'); module.exports = Object.assign(svm, factory(svm)); }
  else root.ML = Object.assign(root.ML, factory(root.ML));
})(typeof self !== 'undefined' ? self : this, function (ML) {
  'use strict';
  const out = {};
  const seq = (n) => Array.from({ length: n }, (_, i) => i);
  const asc = (a, b) => a - b;
  function complement(n, test) { const m = new Uint8Array(n); for (const i of test) m[i] = 1; const tr = []; for (let i = 0; i < n; i++) if (!m[i]) tr.push(i); return tr; }
  const toSplits = (n, tests) => tests.map((te) => { te.sort(asc); return { train: complement(n, te), test: te }; });
  out.complementIdx = complement;

  /* ---------- fold schemes ---------- */
  /** KFold(k). Without `rng` the folds are contiguous blocks (shuffle=False); with `rng` the rows are shuffled first. Returns [{train, test}]. */
  out.kFold = function (n, k, rng) {
    const idx = seq(n); if (rng) rng.shuffle(idx);
    let cur = 0; const tests = [];
    for (let f = 0; f < k; f++) { const size = Math.floor(n / k) + (f < n % k ? 1 : 0); tests.push(idx.slice(cur, cur + size)); cur += size; }
    return toSplits(n, tests);
  };
  /** StratifiedKFold(k): scikit-learn's allocation rule. Without `rng` rows keep their order inside each class (shuffle=False). */
  out.stratKFold = function (y, k, rng) {
    // scikit-learn numbers the classes in order of first appearance, and that order decides the allocation
    const n = y.length, classes = Array.from(new Set(y)), code = new Map(classes.map((c, i) => [c, i])), enc = Array.from(y, (v) => code.get(v)), esorted = enc.slice().sort(asc);
    const alloc = Array.from({ length: k }, () => new Array(classes.length).fill(0));
    for (let f = 0; f < k; f++) for (let i = f; i < n; i += k) alloc[f][esorted[i]]++;
    const tests = Array.from({ length: k }, () => []);
    classes.forEach((c, ci) => {
      const seqF = []; for (let f = 0; f < k; f++) for (let r = 0; r < alloc[f][ci]; r++) seqF.push(f);
      const members = []; for (let i = 0; i < n; i++) if (y[i] === c) members.push(i);
      if (rng) rng.shuffle(members);
      members.forEach((i, p) => tests[seqF[p]].push(i));
    });
    return toSplits(n, tests);
  };
  /** GroupKFold(k) without shuffling, as scikit-learn: biggest groups first, each into the lightest fold. groups: integer ids. */
  out.groupKFold = function (groups, k) {
    const n = groups.length, uniq = Array.from(new Set(groups)).sort(asc), pos = new Map(uniq.map((g, i) => [g, i])), cnt = new Array(uniq.length).fill(0);
    groups.forEach((g) => cnt[pos.get(g)]++);
    const order = seq(uniq.length).sort((a, b) => cnt[a] - cnt[b] || a - b).reverse();
    const load = new Array(k).fill(0), fold = new Array(uniq.length);
    for (const gi of order) { let f = 0; for (let j = 1; j < k; j++) if (load[j] < load[f]) f = j; load[f] += cnt[gi]; fold[gi] = f; }
    const tests = Array.from({ length: k }, () => []); groups.forEach((g, i) => tests[fold[pos.get(g)]].push(i));
    return toSplits(n, tests);
  };
  /** TimeSeriesSplit(k) forward chaining: train on everything before each test block. opts: gap, testSize, maxTrain. */
  out.timeSeriesSplit = function (n, k, opts) {
    opts = opts || {}; const gap = opts.gap || 0, testSize = opts.testSize || Math.floor(n / (k + 1)), res = [];
    for (let ts = n - k * testSize; ts < n; ts += testSize) {
      const trainEnd = ts - gap; let start = 0; if (opts.maxTrain && opts.maxTrain < trainEnd) start = trainEnd - opts.maxTrain;
      res.push({ train: seq(trainEnd - start).map((i) => i + start), test: seq(testSize).map((i) => ts + i) });
    }
    return res;
  };
  /** one random hold-out split: {train, test}; with y the split is stratified */
  out.holdout = function (n, testFrac, rng) {
    const idx = seq(n); rng.shuffle(idx); const nt = Math.max(1, Math.min(n - 1, Math.round(n * testFrac)));
    const te = idx.slice(0, nt).sort(asc); return { train: complement(n, te), test: te };
  };
  /** `reps` reshuffled k-fold runs: array (one per run) of fold lists */
  out.repeatedKFold = (n, k, reps, rng) => Array.from({ length: reps }, () => out.kFold(n, k, rng));
  /** what could go wrong with a scheme: positive-class share per test fold, groups on both sides, test rows earlier than a training row.
   *  info: {y (0/1), groups, time (default: row order)} */
  out.foldDiagnostics = function (splits, info) {
    const y = info.y, g = info.groups, t = info.time;
    return splits.map((s) => {
      const r = { nTest: s.test.length, nTrain: s.train.length };
      if (y) { let pos = 0; for (const i of s.test) pos += y[i] > 0 ? 1 : 0; r.pos = pos; r.posShare = s.test.length ? pos / s.test.length : NaN; }
      if (g) { const tr = new Set(s.train.map((i) => g[i])), both = new Set(); for (const i of s.test) if (tr.has(g[i])) both.add(g[i]); r.groupsBoth = both.size; r.groupsTest = new Set(s.test.map((i) => g[i])).size; r.rowsLeak = s.test.filter((i) => tr.has(g[i])).length; }
      if (s.train.length) { let mx = -Infinity; for (const i of s.train) { const v = t ? t[i] : i; if (v > mx) mx = v; } r.earlier = s.test.filter((i) => (t ? t[i] : i) < mx).length; } else r.earlier = 0;
      return r;
    });
  };

  /* ---------- scores ---------- */
  /** rank-based AUC (Mann-Whitney) with ties counted half, same value as scikit-learn's roc_auc_score. y: 1/0 or +1/-1 (positive when > 0). */
  out.auc = function (scores, y) {
    const n = scores.length, order = seq(n).sort((a, b) => scores[a] - scores[b]), rank = new Float64Array(n);
    for (let i = 0; i < n;) { let j = i; while (j + 1 < n && scores[order[j + 1]] === scores[order[i]]) j++; const r = (i + j) / 2 + 1; for (let k = i; k <= j; k++) rank[order[k]] = r; i = j + 1; }
    let n1 = 0, sum = 0; for (let i = 0; i < n; i++) if (y[i] > 0) { n1++; sum += rank[i]; }
    const n0 = n - n1; if (!n1 || !n0) return NaN; return (sum - n1 * (n1 + 1) / 2) / (n1 * n0);
  };
  /** ROC curve as [[fpr, tpr], ...] from (0,0) to (1,1), one point per distinct score */
  out.rocCurve = function (scores, y) {
    const n = scores.length, order = seq(n).sort((a, b) => scores[b] - scores[a]); let n1 = 0; for (let i = 0; i < n; i++) if (y[i] > 0) n1++;
    const n0 = n - n1, pts = [[0, 0]]; let tp = 0, fp = 0;
    for (let i = 0; i < n; i++) { if (y[order[i]] > 0) tp++; else fp++; if (i === n - 1 || scores[order[i + 1]] !== scores[order[i]]) pts.push([fp / n0, tp / n1]); }
    return pts;
  };
  out.accuracy = (pred, y) => { let c = 0; for (let i = 0; i < y.length; i++) if ((pred[i] > 0) === (y[i] > 0)) c++; return c / y.length; };
  out.stats = function (a) {
    const n = a.length; if (!n) return { mean: NaN, sd: NaN, min: NaN, max: NaN, n: 0 };
    let m = 0, mn = Infinity, mx = -Infinity; for (const v of a) { m += v; if (v < mn) mn = v; if (v > mx) mx = v; } m /= n;
    let s = 0; for (const v of a) s += (v - m) * (v - m); return { mean: m, sd: Math.sqrt(s / n), min: mn, max: mx, n };
  };
  out.quantile = function (a, q) { const s = Array.from(a).sort(asc), p = (s.length - 1) * q, lo = Math.floor(p), hi = Math.ceil(p); return s[lo] + (s[hi] - s[lo]) * (p - lo); };

  /* ---------- fast normal numbers (both Box-Muller outputs) ---------- */
  out.normalFill = function (rng, a) {
    for (let i = 0; i < a.length; i += 2) { const u = rng() || 1e-300, r = Math.sqrt(-2 * Math.log(u)), t = 6.283185307179586 * rng(); a[i] = r * Math.cos(t); if (i + 1 < a.length) a[i + 1] = r * Math.sin(t); }
    return a;
  };

  /* ---------- univariate feature selection ---------- */
  /** one-way ANOVA F statistic of every column against the class labels (scikit-learn's f_classif). rows: optional subset of row indices. */
  out.fClassif = function (X, y, rows) {
    const n = rows ? rows.length : X.length, p = X[0].length, classes = Array.from(new Set(rows ? rows.map((i) => y[i]) : y)).sort(asc), K = classes.length;
    const cix = new Map(classes.map((c, i) => [c, i])), cnt = new Float64Array(K), sums = classes.map(() => new Float64Array(p)), sumsq = new Float64Array(p), tot = new Float64Array(p);
    for (let r = 0; r < n; r++) {
      const i = rows ? rows[r] : r, c = cix.get(y[i]), x = X[i], s = sums[c]; cnt[c]++;
      for (let j = 0; j < p; j++) { const v = x[j]; s[j] += v; sumsq[j] += v * v; tot[j] += v; }
    }
    const F = new Float64Array(p);
    for (let j = 0; j < p; j++) {
      const grand = tot[j] / n; let between = 0;
      for (let c = 0; c < K; c++) { const m = sums[c][j] / cnt[c]; between += cnt[c] * (m - grand) * (m - grand); }
      const within = sumsq[j] - n * grand * grand - between; F[j] = (between / (K - 1)) / (within / (n - K));
    }
    return F;
  };
  /** indices of the k largest scores, like SelectKBest (stable sort ascending, last k: ties prefer later columns) */
  out.topK = function (scores, k) { const idx = seq(scores.length).sort((a, b) => scores[a] - scores[b] || a - b); return idx.slice(idx.length - k); };

  /* ---------- small classifiers ---------- */
  /** nearest centroid on the columns `cols` (all by default). Fits on rows `rows` of X. predict(x) -> 0/1 for labels y in {0,1}. */
  out.nearestCentroid = function (X, y, rows, cols) {
    const p = cols ? cols.length : X[0].length, c = [new Float64Array(p), new Float64Array(p)], cnt = [0, 0];
    for (const i of rows) { const k = y[i] > 0 ? 1 : 0, x = X[i]; cnt[k]++; for (let j = 0; j < p; j++) c[k][j] += x[cols ? cols[j] : j]; }
    for (let k = 0; k < 2; k++) for (let j = 0; j < p; j++) c[k][j] /= Math.max(1, cnt[k]);
    const predict = (x) => { let d0 = 0, d1 = 0; for (let j = 0; j < p; j++) { const v = x[cols ? cols[j] : j], a = v - c[0][j], b = v - c[1][j]; d0 += a * a; d1 += b * b; } return d1 < d0 ? 1 : 0; };
    return { centroids: c, predict };
  };
  /** brute-force k nearest neighbours. opts: k, weights 'uniform' | 'distance', p 1 | 2. Returns labels (0/1) for the rows of Xte. */
  out.knnPredict = function (Xtr, ytr, Xte, opts) {
    const k = Math.min(opts.k || 5, Xtr.length), dist = opts.weights === 'distance', l1 = opts.p === 1, d = Xtr[0].length, res = new Array(Xte.length);
    const bd = new Float64Array(k), bl = new Int8Array(k);
    for (let t = 0; t < Xte.length; t++) {
      const x = Xte[t]; let m = 0;
      for (let i = 0; i < Xtr.length; i++) {
        const z = Xtr[i]; let s = 0; if (l1) for (let j = 0; j < d; j++) s += Math.abs(z[j] - x[j]); else { for (let j = 0; j < d; j++) { const q = z[j] - x[j]; s += q * q; } s = Math.sqrt(s); }
        if (m < k) { let q = m++; while (q > 0 && bd[q - 1] > s) { bd[q] = bd[q - 1]; bl[q] = bl[q - 1]; q--; } bd[q] = s; bl[q] = ytr[i] > 0 ? 1 : 0; }
        else if (s < bd[k - 1]) { let q = k - 1; while (q > 0 && bd[q - 1] > s) { bd[q] = bd[q - 1]; bl[q] = bl[q - 1]; q--; } bd[q] = s; bl[q] = ytr[i] > 0 ? 1 : 0; }
      }
      let w1 = 0, w0 = 0; for (let q = 0; q < k; q++) { const w = dist ? 1 / (bd[q] + 1e-12) : 1; if (bl[q]) w1 += w; else w0 += w; }
      res[t] = w1 > w0 ? 1 : 0;
    }
    return res;
  };
  /** Precomputed k-NN table for many (k, weights, p) settings on one dataset. configs: [{k, weights, p}].
   *  scoreAll(trainIdx, testIdx) -> Float64Array of accuracies, one per config (every config scored from one pass over the neighbours). */
  out.knnGrid = function (X, y, configs) {
    const n = X.length, d = X[0].length, ps = Array.from(new Set(configs.map((c) => c.p))), kmax = Math.max(...configs.map((c) => c.k)), M = {};
    ps.forEach((p) => {
      const D = new Float64Array(n * n);
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { let s = 0; if (p === 1) for (let q = 0; q < d; q++) s += Math.abs(X[i][q] - X[j][q]); else { for (let q = 0; q < d; q++) { const t = X[i][q] - X[j][q]; s += t * t; } s = Math.sqrt(s); } D[i * n + j] = s; D[j * n + i] = s; }
      const order = new Int32Array(n * (n - 1));
      for (let i = 0; i < n; i++) { const o = []; for (let j = 0; j < n; j++) if (j !== i) o.push(j); o.sort((a, b) => D[i * n + a] - D[i * n + b]); order.set(o, i * (n - 1)); }
      M[p] = { D, order };
    });
    const y01 = Int8Array.from(y, (v) => (v > 0 ? 1 : 0));
    function scoreAll(train, test) {
      const mask = new Uint8Array(n); for (const i of train) mask[i] = 1;
      const correct = new Float64Array(configs.length), cu = new Float64Array(kmax), cd = new Float64Array(kmax), lab = new Int8Array(kmax), dd = new Float64Array(kmax);
      for (const i of test) {
        for (const p of ps) {
          const { D, order } = M[p]; let m = 0; const base = i * (n - 1);
          for (let r = 0; r < n - 1 && m < kmax; r++) { const j = order[base + r]; if (mask[j]) { lab[m] = y01[j]; dd[m] = D[i * n + j]; m++; } }
          let u1 = 0, u0 = 0, d1 = 0, d0 = 0;
          for (let q = 0; q < m; q++) { const w = 1 / (dd[q] + 1e-12); if (lab[q]) { u1++; d1 += w; } else { u0++; d0 += w; } cu[q] = u1 > u0 ? 1 : 0; cd[q] = d1 > d0 ? 1 : 0; }
          for (let c = 0; c < configs.length; c++) { const cf = configs[c]; if (cf.p !== p) continue; const q = Math.min(cf.k, m) - 1; if (q < 0) continue; if (((cf.weights === 'distance' ? cd[q] : cu[q]) === 1) === (y01[i] === 1)) correct[c]++; }
        }
      }
      for (let c = 0; c < configs.length; c++) correct[c] /= test.length;
      return correct;
    }
    return { scoreAll, n };
  };

  /* ---------- nested cross-validation ---------- */
  const sub = (idx, splits) => splits.map((s) => ({ train: s.train.map((i) => idx[i]), test: s.test.map((i) => idx[i]) }));
  /** Score tables for nested CV. scoreAll(train, test) -> array over configs. outer: [{train,test}]. innerFn(trainIdx) -> splits of that training set (absolute indices).
   *  Returns {inner[f][c] (mean over inner folds), outer[f][c]}: enough to pick the winner among the first m configs for any m. */
  out.nestedTables = function (scoreAll, outer, innerFn) {
    const inner = [], outerS = [];
    outer.forEach((o) => {
      const sp = innerFn(o.train); let acc = null;
      sp.forEach((s) => { const v = scoreAll(s.train, s.test); if (!acc) acc = new Float64Array(v.length); for (let c = 0; c < v.length; c++) acc[c] += v[c] / sp.length; });
      inner.push(acc); outerS.push(scoreAll(o.train, o.test));
    });
    return { inner, outer: outerS };
  };
  /** from the tables, using only configs 0..m-1: bestIdx = highest mean outer-fold score ('best CV'), best = that score,
   *  nested = mean outer score of the config each outer fold picked on its inner folds. */
  out.nestedPick = function (T, m) {
    const F = T.outer.length; let bi = 0, bs = -1;
    for (let c = 0; c < m; c++) { let s = 0; for (let f = 0; f < F; f++) s += T.outer[f][c]; s /= F; if (s > bs + 1e-12) { bs = s; bi = c; } }
    let nest = 0; const chosen = [];
    for (let f = 0; f < F; f++) { let ci = 0; for (let c = 1; c < m; c++) if (T.inner[f][c] > T.inner[f][ci] + 1e-12) ci = c; chosen.push(ci); nest += T.outer[f][ci] / F; }
    return { bestIdx: bi, best: bs, nested: nest, chosen };
  };
  out.subSplits = sub;

  /* ---------- a compact TPE sampler (not the Optuna package) ---------- */
  const SQ2 = Math.SQRT2, erf = (x) => { const s = x < 0 ? -1 : 1; x = Math.abs(x); const t = 1 / (1 + 0.3275911 * x); return s * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x)); };
  const Phi = (z) => 0.5 * (1 + erf(z / SQ2));
  /** Parzen estimator on [0,1]: one Gaussian per point plus one flat component; returns {logpdf(x), sample(rng)} */
  function parzen(pts) {
    const n = pts.length, s = pts.slice().sort(asc), minSigma = 1 / Math.min(100, n + 2), comps = [];
    for (let i = 0; i < n; i++) { const left = i === 0 ? s[0] : s[i] - s[i - 1], right = i === n - 1 ? 1 - s[n - 1] : s[i + 1] - s[i]; comps.push({ mu: s[i], sg: Math.min(1, Math.max(minSigma, left, right)) }); }
    comps.forEach((c) => { c.z = Phi((1 - c.mu) / c.sg) - Phi((0 - c.mu) / c.sg); });
    const w = 1 / (n + 1);
    return {
      logpdf(x) { let t = w; for (const c of comps) { const q = (x - c.mu) / c.sg; t += w * Math.exp(-0.5 * q * q) / (c.sg * 2.5066282746 * c.z); } return Math.log(t); },
      sample(rng) { const u = rng() * (n + 1); if (u >= n) return rng(); const c = comps[Math.floor(u)]; for (let t = 0; t < 40; t++) { const v = c.mu + c.sg * rng.normal(); if (v >= 0 && v <= 1) return v; } return Math.min(1, Math.max(0, c.mu)); },
    };
  }
  /** One TPE suggestion in [0,1]^dim (maximising). hist: [{x: [..], score}]. opts: startup (random trials first), gamma (share of trials called 'good'), cand (candidates per dimension).
   *  Splits the trials into good and bad, fits a Parzen density to each, draws candidates from the good one and keeps the one with the largest good/bad density ratio. */
  out.tpeSuggest = function (hist, dim, rng, opts) {
    opts = opts || {}; const startup = opts.startup == null ? 5 : opts.startup, gamma = opts.gamma || 0.25, nc = opts.cand || 24, x = new Array(dim);
    if (hist.length < startup) { for (let j = 0; j < dim; j++) x[j] = rng(); return x; }
    const sorted = hist.slice().sort((a, b) => b.score - a.score), nb = Math.max(1, Math.ceil(gamma * sorted.length)), good = sorted.slice(0, nb), bad = sorted.slice(nb);
    for (let j = 0; j < dim; j++) {
      const l = parzen(good.map((h) => h.x[j])), g = parzen(bad.map((h) => h.x[j])); let best = -Infinity, bx = rng();
      for (let c = 0; c < nc; c++) { const v = l.sample(rng), r = l.logpdf(v) - g.logpdf(v); if (r > best) { best = r; bx = v; } }
      x[j] = bx;
    }
    return x;
  };

  /* ---------- data generators ---------- */
  /** two overlapping Gaussian classes in the plane, n/2 each. Bayes accuracy about 85%. */
  out.twoClasses = function (n, rng, shift) {
    const a = Math.floor(n / 2), X = [], y = [], s = shift == null ? 1 : shift;
    for (let i = 0; i < n; i++) { const c = i < a ? 0 : 1, m = c ? 1 : -1; X.push([m * 0.9 * s + rng.normal(), m * 0.55 * s + rng.normal()]); y.push(c); }
    const o = seq(n); rng.shuffle(o); return { X: o.map((i) => X[i]), y: o.map((i) => y[i]) };
  };
  /** labels are fair coin flips and every feature is pure noise */
  out.noiseData = function (n, p, rng) {
    const X = [], y = []; for (let i = 0; i < n; i++) { const r = new Float64Array(p); out.normalFill(rng, r); X.push(r); y.push(rng() < 0.5 ? 0 : 1); }
    return { X, y };
  };
  /** features with a controllable signal: d features, the first two carry a class shift of `signal` each; labels balanced (n/2 each) */
  out.signalData = function (n, d, signal, rng) {
    const X = [], y = [], a = Math.floor(n / 2);
    for (let i = 0; i < n; i++) { const c = i < a ? 0 : 1, m = c ? 0.5 : -0.5, r = new Float64Array(d); for (let j = 0; j < d; j++) r[j] = rng.normal() + (j < 2 ? m * signal : 0); X.push(r); y.push(c); }
    const o = seq(n); rng.shuffle(o); return { X: o.map((i) => X[i]), y: o.map((i) => y[i]) };
  };
  /** customers with several rows each. A customer's label is fixed; its rows sit in a tight cluster around its own centre in 4-D.
   *  signal: how far the label moves the centre along feature 0 (0 = the features say nothing about the label). Rows are in random order. */
  out.customers = function (nGroups, rowsPer, signal, rng) {
    const X = [], y = [], g = [];
    for (let k = 0; k < nGroups; k++) { const lab = rng() < 0.5 ? 0 : 1, c = [rng.normal() + (lab ? 0.5 : -0.5) * signal, rng.normal(), rng.normal(), rng.normal()]; for (let r = 0; r < rowsPer; r++) { X.push(c.map((v) => v + 0.15 * rng.normal())); y.push(lab); g.push(k); } }
    const o = seq(X.length); rng.shuffle(o); return { X: o.map((i) => X[i]), y: o.map((i) => y[i]), group: o.map((i) => g[i]) };
  };
  /** rows in time order; the label rule rotates with time: y = [cos(phi t) x1 + sin(phi t) x2 + noise > 0], phi in radians per unit time. t runs t0..t1. Feature 3 is t. */
  out.driftData = function (n, phi, t0, t1, rng) {
    const X = [], y = [], t = [];
    for (let i = 0; i < n; i++) {
      const tt = t0 + (t1 - t0) * (i + 0.5) / n, a = phi * tt, x1 = rng.normal(), x2 = rng.normal(), z = Math.cos(a) * x1 + Math.sin(a) * x2 + 0.35 * rng.normal();
      X.push([x1, x2, tt]); y.push(z > 0 ? 1 : 0); t.push(tt);
    }
    return { X, y, t };
  };
  /** gamma(shape, scale) for shape a whole number or a whole number plus one half */
  const gammaDraw = function (shape, scale, rng) {
    let s = 0; const whole = Math.floor(shape); for (let i = 0; i < whole; i++) s -= Math.log(rng() || 1e-300);
    if (shape - whole > 0.25) { const z = rng.normal(); s += 0.5 * z * z; }
    return s * scale;
  };
  const poisson = function (lambda, rng) { const L = Math.exp(-lambda); let k = 0, p = 1; do { k++; p *= rng(); } while (p > L); return k - 1; };
  /** A made-up churn table of `n` customers. Honest columns are known when the prediction is made; three leaky columns are written by the churn event.
   *  Each row has 'post' (as recorded in the offline table) and 'pre' (what the same columns hold the day before the customer decides) versions of the leaky columns. */
  out.churnData = function (n, rng) {
    const rows = [];
    for (let i = 0; i < n; i++) {
      const tenure = Math.max(1, Math.round(25 + 18 * rng.normal())), monthly = Math.min(120, Math.max(20, 70 + 22 * rng.normal())), calls = Math.min(8, poisson(1, rng)),
        m2m = rng() < 0.55 ? 1 : 0, drop = rng.normal(), month = 1 + Math.floor(rng() * 12);
      const z = -2.2 - 0.035 * (tenure - 25) + 0.018 * (monthly - 70) + 0.35 * calls + 0.9 * m2m + 0.55 * drop, p = 1 / (1 + Math.exp(-z)), churn = rng() < p ? 1 : 0;
      const surveyPost = rng() < (churn ? 0.92 : 0.02) ? 1 : 0, refundPost = rng() < (churn ? 0.4 : 0.01) ? 1 : 0, loginPost = churn ? gammaDraw(3, 4, rng) : gammaDraw(2.5, 3, rng), loginPre = gammaDraw(2.5, 3, rng);
      rows.push({ month, tenure, monthly, calls, m2m, drop, churn, surveyPost, refundPost, loginPost, surveyPre: 0, refundPre: 0, loginPre });
    }
    return rows;
  };
  out.CHURN_COLUMNS = [
    { id: 'tenure', label: 'tenure (months)', known: true }, { id: 'monthly', label: 'monthly_charges', known: true }, { id: 'calls', label: 'support_calls (last 30 days)', known: true },
    { id: 'm2m', label: 'contract = month-to-month', known: true }, { id: 'drop', label: 'usage_drop (vs last quarter)', known: true },
    { id: 'survey', label: 'cancellation_survey_sent', known: false }, { id: 'refund', label: 'refund_issued', known: false }, { id: 'login', label: 'days_since_last_login_at_snapshot', known: false },
  ];
  /** matrix of the chosen columns (ids). 'live' = the leaky columns as they are the day before the decision */
  out.churnMatrix = function (rows, ids, live) {
    const f = { tenure: (r) => r.tenure, monthly: (r) => r.monthly, calls: (r) => r.calls, m2m: (r) => r.m2m, drop: (r) => r.drop, survey: (r) => (live ? r.surveyPre : r.surveyPost), refund: (r) => (live ? r.refundPre : r.refundPost), login: (r) => (live ? r.loginPre : r.loginPost) };
    return rows.map((r) => Float64Array.from(ids, (id) => f[id](r)));
  };
  return out;
});
