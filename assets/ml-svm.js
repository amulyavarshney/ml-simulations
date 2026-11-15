/* ml-svm.js: kernels, a libsvm-style SMO solver (SVC, epsilon-SVR, one-class SVM), logistic regression, TF-IDF.
 * The solver follows libsvm's working-set selection (second order) and update rules, without shrinking, so
 * results agree with scikit-learn's SVC / SVR / OneClassSVM to solver tolerance (see tests/test-svm.js).
 * Needs ml-core.js loaded first (browser) or required first (Node).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { const core = require('./ml-core.js'); module.exports = Object.assign(core, factory(core)); }
  else root.ML = Object.assign(root.ML, factory(root.ML));
})(typeof self !== 'undefined' ? self : this, function (ML) {
  'use strict';
  const out = {};
  const dot = ML.dot;

  /* ---------- kernels ---------- */
  /** spec: {kernel:'linear'|'poly'|'rbf', gamma, degree, coef0}. Returns k(a, b). */
  out.kernelFn = function (spec) {
    const g = spec.gamma == null ? 1 : spec.gamma, r = spec.coef0 || 0, d = spec.degree || 3;
    if (spec.kernel === 'linear') return (a, b) => dot(a, b);
    if (spec.kernel === 'poly') return (a, b) => Math.pow(g * dot(a, b) + r, d);
    return (a, b) => Math.exp(-g * ML.sqdist(a, b));
  };
  out.gram = function (X, k) {
    const n = X.length, K = new Float64Array(n * n);
    for (let i = 0; i < n; i++) for (let j = i; j < n; j++) { const v = k(X[i], X[j]); K[i * n + j] = v; K[j * n + i] = v; }
    return K;
  };
  /** gamma='scale' of scikit-learn: 1 / (n_features * Var(X)) with Var over every entry */
  out.gammaScale = function (X) {
    const d = X[0].length; let s = 0, s2 = 0, c = 0;
    for (const r of X) for (let j = 0; j < d; j++) { s += r[j]; s2 += r[j] * r[j]; c++; }
    const m = s / c, v = s2 / c - m * m; return 1 / (d * (v > 0 ? v : 1));
  };

  /* ---------- the SMO solver (libsvm Solver::Solve without shrinking) ----------
   * minimise 1/2 a'Qa + p'a  subject to  y'a = const,  0 <= a_i <= C_i
   * getQ(i, buf) fills buf[0..L) with row i of Q; QD is diag(Q). */
  const TAU = 1e-12;
  out.solve = function (L, getQ, QD, p, y, alpha, Cp, Cn, eps, maxIter, deadline) {
    const G = Float64Array.from(p), LOWER = 0, UPPER = 1, FREE = 2;
    const C = (i) => (y[i] > 0 ? Cp : Cn);
    const st = new Int8Array(L);
    const upd = (i) => { st[i] = alpha[i] >= C(i) ? UPPER : alpha[i] <= 0 ? LOWER : FREE; };
    for (let i = 0; i < L; i++) upd(i);
    const Qi = new Float64Array(L), Qj = new Float64Array(L);
    for (let i = 0; i < L; i++) if (st[i] !== LOWER) { getQ(i, Qi); const a = alpha[i]; for (let j = 0; j < L; j++) G[j] += a * Qi[j]; }
    let iter = 0, converged = false;
    maxIter = maxIter || 10000000;
    while (iter < maxIter) {
      if (deadline && (iter & 255) === 0 && Date.now() > deadline) break;
      let Gmax = -Infinity, Gmax2 = -Infinity, iSel = -1, jSel = -1, objMin = Infinity;
      for (let t = 0; t < L; t++) {
        if (y[t] > 0) { if (st[t] !== UPPER && -G[t] >= Gmax) { Gmax = -G[t]; iSel = t; } }
        else { if (st[t] !== LOWER && G[t] >= Gmax) { Gmax = G[t]; iSel = t; } }
      }
      if (iSel < 0) { converged = true; break; }
      const i = iSel; getQ(i, Qi);
      for (let j = 0; j < L; j++) {
        if (y[j] > 0) {
          if (st[j] !== LOWER) {
            const gd = Gmax + G[j]; if (G[j] >= Gmax2) Gmax2 = G[j];
            if (gd > 0) { const qc = QD[i] + QD[j] - 2 * y[i] * Qi[j]; const od = qc > 0 ? -(gd * gd) / qc : -(gd * gd) / TAU; if (od <= objMin) { jSel = j; objMin = od; } }
          }
        } else if (st[j] !== UPPER) {
          const gd = Gmax - G[j]; if (-G[j] >= Gmax2) Gmax2 = -G[j];
          if (gd > 0) { const qc = QD[i] + QD[j] + 2 * y[i] * Qi[j]; const od = qc > 0 ? -(gd * gd) / qc : -(gd * gd) / TAU; if (od <= objMin) { jSel = j; objMin = od; } }
        }
      }
      if (Gmax + Gmax2 < eps || jSel < 0) { converged = true; break; }
      const j = jSel; getQ(j, Qj);
      const Ci = C(i), Cj = C(j), oi = alpha[i], oj = alpha[j];
      if (y[i] !== y[j]) {
        let qc = QD[i] + QD[j] + 2 * Qi[j]; if (qc <= 0) qc = TAU;
        const delta = (-G[i] - G[j]) / qc, diff = alpha[i] - alpha[j];
        alpha[i] += delta; alpha[j] += delta;
        if (diff > 0) { if (alpha[j] < 0) { alpha[j] = 0; alpha[i] = diff; } } else if (alpha[i] < 0) { alpha[i] = 0; alpha[j] = -diff; }
        if (diff > Ci - Cj) { if (alpha[i] > Ci) { alpha[i] = Ci; alpha[j] = Ci - diff; } } else if (alpha[j] > Cj) { alpha[j] = Cj; alpha[i] = Cj + diff; }
      } else {
        let qc = QD[i] + QD[j] - 2 * Qi[j]; if (qc <= 0) qc = TAU;
        const delta = (G[i] - G[j]) / qc, sum = alpha[i] + alpha[j];
        alpha[i] -= delta; alpha[j] += delta;
        if (sum > Ci) { if (alpha[i] > Ci) { alpha[i] = Ci; alpha[j] = sum - Ci; } } else if (alpha[j] < 0) { alpha[j] = 0; alpha[i] = sum; }
        if (sum > Cj) { if (alpha[j] > Cj) { alpha[j] = Cj; alpha[i] = sum - Cj; } } else if (alpha[i] < 0) { alpha[i] = 0; alpha[j] = sum; }
      }
      const di = alpha[i] - oi, dj = alpha[j] - oj;
      for (let k = 0; k < L; k++) G[k] += Qi[k] * di + Qj[k] * dj;
      upd(i); upd(j); iter++;
    }
    // rho as in libsvm
    let ub = Infinity, lb = -Infinity, sumFree = 0, nFree = 0;
    for (let i = 0; i < L; i++) {
      const yG = y[i] * G[i];
      if (st[i] === UPPER) { if (y[i] < 0) ub = Math.min(ub, yG); else lb = Math.max(lb, yG); }
      else if (st[i] === LOWER) { if (y[i] > 0) ub = Math.min(ub, yG); else lb = Math.max(lb, yG); }
      else { nFree++; sumFree += yG; }
    }
    const rho = nFree > 0 ? sumFree / nFree : (ub + lb) / 2;
    let obj = 0; for (let i = 0; i < L; i++) obj += alpha[i] * (G[i] + p[i]) / 2;
    return { rho, iter, converged, obj, G };
  };

  /* ---------- model wrapper ---------- */
  function finish(model, X, spec, kfn) {
    model.X = X; model.spec = spec; model.kfn = kfn;
    model.svIdx = []; model.coef = [];
    for (let i = 0; i < X.length; i++) if (Math.abs(model.coefAll[i]) > 1e-10) { model.svIdx.push(i); model.coef.push(model.coefAll[i]); }
    model.SV = model.svIdx.map((i) => X[i]); model.nSV = model.svIdx.length;
    model.decision = function (x) { let s = -model.rho; for (let k = 0; k < model.SV.length; k++) s += model.coef[k] * kfn(model.SV[k], x); return s; };
    /** decision values for a batch of points */
    model.decisionMany = (P) => P.map(model.decision);
    if (spec.kernel === 'linear') {
      const d = X[0].length, w = new Float64Array(d);
      for (let k = 0; k < model.SV.length; k++) for (let j = 0; j < d; j++) w[j] += model.coef[k] * model.SV[k][j];
      model.w = w; model.b = -model.rho;
    }
    return model;
  }
  function rowFiller(K, n, sign) { // Q row for variables mapped onto n samples with +-1 signs
    return function (i, buf) {
      const idx = sign ? (i < n ? i : i - n) : i, si = sign ? (i < n ? 1 : -1) : 1;
      if (!sign) { for (let j = 0; j < n; j++) buf[j] = K[idx * n + j]; return; }
      for (let j = 0; j < 2 * n; j++) { const jj = j < n ? j : j - n, sj = j < n ? 1 : -1; buf[j] = si * sj * K[idx * n + jj]; }
    };
  }

  /** Binary C-support-vector classifier. y in {-1, +1} (or 0/1, mapped). opts: kernel, gamma, degree, coef0, C, tol, K (precomputed Gram), maxMs. */
  out.svc = function (X, yRaw, opts) {
    const n = X.length, y = new Int8Array(n); for (let i = 0; i < n; i++) y[i] = yRaw[i] > 0 ? 1 : -1;
    const spec = Object.assign({ kernel: 'rbf', gamma: 1, degree: 3, coef0: 0, C: 1, tol: 1e-3 }, opts || {});
    const kfn = out.kernelFn(spec), K = spec.K || out.gram(X, kfn);
    const Q = (i, buf) => { const yi = y[i]; for (let j = 0; j < n; j++) buf[j] = yi * y[j] * K[i * n + j]; };
    const QD = new Float64Array(n); for (let i = 0; i < n; i++) QD[i] = K[i * n + i];
    const alpha = new Float64Array(n), p = new Float64Array(n).fill(-1);
    const res = out.solve(n, Q, QD, p, y, alpha, spec.C, spec.C, spec.tol, spec.maxIter, spec.maxMs ? Date.now() + spec.maxMs : 0);
    const model = { type: 'svc', alpha, y, rho: res.rho, iter: res.iter, converged: res.converged, obj: res.obj, C: spec.C };
    model.coefAll = Float64Array.from(alpha, (a, i) => a * y[i]);
    model.atBound = (i) => alpha[i] >= spec.C - 1e-8 * Math.max(1, spec.C);
    finish(model, X, spec, kfn);
    model.predict = (x) => (model.decision(x) >= 0 ? 1 : -1);
    model.score = (Xt, yt) => { let c = 0; for (let i = 0; i < Xt.length; i++) if (model.predict(Xt[i]) === (yt[i] > 0 ? 1 : -1)) c++; return c / Xt.length; };
    return model;
  };

  /** epsilon-SVR (libsvm formulation with 2n variables). opts: kernel, gamma, degree, coef0, C, epsilon, tol */
  out.svr = function (X, y, opts) {
    const n = X.length, spec = Object.assign({ kernel: 'rbf', gamma: 1, degree: 3, coef0: 0, C: 1, epsilon: 0.1, tol: 1e-3 }, opts || {});
    const kfn = out.kernelFn(spec), K = spec.K || out.gram(X, kfn), L = 2 * n;
    const ys = new Int8Array(L), p = new Float64Array(L), QD = new Float64Array(L), alpha = new Float64Array(L);
    for (let i = 0; i < n; i++) { ys[i] = 1; ys[i + n] = -1; p[i] = spec.epsilon - y[i]; p[i + n] = spec.epsilon + y[i]; QD[i] = QD[i + n] = K[i * n + i]; }
    const res = out.solve(L, rowFiller(K, n, true), QD, p, ys, alpha, spec.C, spec.C, spec.tol, spec.maxIter, spec.maxMs ? Date.now() + spec.maxMs : 0);
    const model = { type: 'svr', rho: res.rho, iter: res.iter, converged: res.converged, obj: res.obj, epsilon: spec.epsilon, C: spec.C };
    model.coefAll = new Float64Array(n); for (let i = 0; i < n; i++) model.coefAll[i] = alpha[i] - alpha[i + n];
    finish(model, X, spec, kfn);
    model.predict = model.decision;
    return model;
  };

  /** one-class SVM (Scholkopf nu formulation as in libsvm). opts: kernel, gamma, nu, tol. decision > 0 means 'inlier'. */
  out.oneClass = function (X, opts) {
    const n = X.length, spec = Object.assign({ kernel: 'rbf', gamma: 1, degree: 3, coef0: 0, nu: 0.1, tol: 1e-3 }, opts || {});
    const kfn = out.kernelFn(spec), K = spec.K || out.gram(X, kfn);
    const alpha = new Float64Array(n), m = Math.floor(spec.nu * n);
    for (let i = 0; i < m; i++) alpha[i] = 1; if (m < n) alpha[m] = spec.nu * n - m;
    const y = new Int8Array(n).fill(1), p = new Float64Array(n), QD = new Float64Array(n);
    for (let i = 0; i < n; i++) QD[i] = K[i * n + i];
    const Q = (i, buf) => { for (let j = 0; j < n; j++) buf[j] = K[i * n + j]; };
    const res = out.solve(n, Q, QD, p, y, alpha, 1, 1, spec.tol, spec.maxIter, spec.maxMs ? Date.now() + spec.maxMs : 0);
    const model = { type: 'oneclass', rho: res.rho, iter: res.iter, converged: res.converged, alpha, nu: spec.nu };
    model.coefAll = Float64Array.from(alpha);
    finish(model, X, spec, kfn);
    model.isOutlier = (x) => model.decision(x) < 0;
    return model;
  };

  /* ---------- logistic regression ---------- */
  /** Binary L2 logistic regression: minimise C * sum log(1 + exp(-y(w.x + b))) + 1/2 |w|^2 (b unpenalised), Newton's method. */
  out.logreg = function (X, yRaw, opts) {
    opts = opts || {}; const C = opts.C == null ? 1 : opts.C, n = X.length, d = X[0].length;
    const y = Array.from(yRaw, (v) => (v > 0 ? 1 : -1)); let w = new Float64Array(d + 1);
    const obj = (w) => { let s = 0; for (let i = 0; i < n; i++) { let z = w[d]; for (let j = 0; j < d; j++) z += w[j] * X[i][j]; const m = -y[i] * z; s += C * (m > 30 ? m : Math.log1p(Math.exp(m))); } for (let j = 0; j < d; j++) s += 0.5 * w[j] * w[j]; return s; };
    for (let it = 0; it < (opts.maxIter || 100); it++) {
      const g = new Float64Array(d + 1), H = Array.from({ length: d + 1 }, () => new Float64Array(d + 1));
      for (let j = 0; j < d; j++) { g[j] = w[j]; H[j][j] = 1; }
      for (let i = 0; i < n; i++) {
        let z = w[d]; for (let j = 0; j < d; j++) z += w[j] * X[i][j];
        const s = 1 / (1 + Math.exp(-y[i] * z)), gi = -C * y[i] * (1 - s), hi = C * s * (1 - s);
        for (let a = 0; a <= d; a++) { const xa = a < d ? X[i][a] : 1; g[a] += gi * xa; for (let b = 0; b <= d; b++) H[a][b] += hi * xa * (b < d ? X[i][b] : 1); }
      }
      for (let a = 0; a <= d; a++) H[a][a] += 1e-10;
      const step = solveLinear(H, g); if (!step) break;
      let t = 1; const f0 = obj(w), gd = ML.dot(g, step);
      for (let k = 0; k < 30; k++) { const w2 = w.map((v, a) => v - t * step[a]); if (obj(w2) <= f0 - 1e-4 * t * gd) { w = w2; break; } t /= 2; if (k === 29) { t = 0; } }
      if (t === 0 || Math.sqrt(ML.dot(g, g)) < 1e-9) break;
    }
    const model = { w: w.slice(0, d), b: w[d], decision: (x) => { let z = w[d]; for (let j = 0; j < d; j++) z += w[j] * x[j]; return z; } };
    model.prob = (x) => 1 / (1 + Math.exp(-model.decision(x)));
    return model;
  };
  function solveLinear(A, b) { // Gaussian elimination with partial pivoting
    const n = b.length, M = A.map((r, i) => Float64Array.from([...r, b[i]]));
    for (let c = 0; c < n; c++) {
      let piv = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
      if (Math.abs(M[piv][c]) < 1e-300) return null; const t = M[c]; M[c] = M[piv]; M[piv] = t;
      for (let r = c + 1; r < n; r++) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
    }
    const x = new Float64Array(n); for (let r = n - 1; r >= 0; r--) { let s = M[r][n]; for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k]; x[r] = s / M[r][r]; } return x;
  }
  out.solveLinear = solveLinear;

  /** Multinomial L2 logistic regression (softmax), Newton with line search. Classes 0..K-1. Minimises C * NLL + 1/2 |W|^2. */
  out.softmax = function (X, y, K, opts) {
    opts = opts || {}; const C = opts.C == null ? 1 : opts.C, n = X.length, d = X[0].length, P = d + 1, T = K * P;
    let w = new Float64Array(T);
    const probs = (w, x) => { const z = new Float64Array(K); let m = -Infinity; for (let k = 0; k < K; k++) { let s = w[k * P + d]; for (let j = 0; j < d; j++) s += w[k * P + j] * x[j]; z[k] = s; if (s > m) m = s; } let t = 0; for (let k = 0; k < K; k++) { z[k] = Math.exp(z[k] - m); t += z[k]; } for (let k = 0; k < K; k++) z[k] /= t; return z; };
    const obj = (w) => { let s = 0; for (let i = 0; i < n; i++) s -= C * Math.log(Math.max(probs(w, X[i])[y[i]], 1e-300)); for (let k = 0; k < K; k++) for (let j = 0; j < d; j++) s += 0.5 * w[k * P + j] * w[k * P + j]; return s; };
    for (let it = 0; it < 60; it++) {
      const g = new Float64Array(T), H = Array.from({ length: T }, () => new Float64Array(T));
      for (let k = 0; k < K; k++) for (let j = 0; j < d; j++) { g[k * P + j] = w[k * P + j]; H[k * P + j][k * P + j] = 1; }
      for (let i = 0; i < n; i++) {
        const pr = probs(w, X[i]), xe = (a) => (a < d ? X[i][a] : 1);
        for (let k = 0; k < K; k++) {
          const gk = C * (pr[k] - (y[i] === k ? 1 : 0));
          for (let a = 0; a < P; a++) g[k * P + a] += gk * xe(a);
          for (let l = 0; l < K; l++) { const h = C * (pr[k] * ((k === l ? 1 : 0) - pr[l])); for (let a = 0; a < P; a++) { const xa = xe(a) * h; for (let b = 0; b < P; b++) H[k * P + a][l * P + b] += xa * xe(b); } }
        }
      }
      for (let a = 0; a < T; a++) H[a][a] += 1e-8;
      const step = solveLinear(H, g); if (!step) break;
      let t = 1; const f0 = obj(w), gd = ML.dot(g, step); let moved = false;
      for (let k = 0; k < 30; k++) { const w2 = w.map((v, a) => v - t * step[a]); if (obj(w2) <= f0 - 1e-4 * t * gd + 1e-14) { w = w2; moved = true; break; } t /= 2; }
      if (!moved || Math.sqrt(ML.dot(g, g)) < 1e-8) break;
    }
    return { w, predict: (x) => { const p = probs(w, x); let b = 0; for (let k = 1; k < K; k++) if (p[k] > p[b]) b = k; return b; } };
  };

  /* ---------- TF-IDF (scikit-learn defaults: smooth idf, L2 norm) ---------- */
  out.tokenize = (s) => (s.toLowerCase().match(/[a-z][a-z']+/g) || []).filter((w) => w.length > 1);
  out.tfidf = function (docs, opts) {
    opts = opts || {}; const stop = new Set(opts.stop || []);
    const toks = docs.map((d) => out.tokenize(d).filter((w) => !stop.has(w))), df = new Map();
    toks.forEach((t) => new Set(t).forEach((w) => df.set(w, (df.get(w) || 0) + 1)));
    const minDf = opts.minDf || 1, vocab = Array.from(df.keys()).filter((w) => df.get(w) >= minDf).sort(), index = new Map(vocab.map((w, i) => [w, i]));
    const N = docs.length, idf = vocab.map((w) => Math.log((1 + N) / (1 + df.get(w))) + 1);
    const vec = (tk) => { const v = new Float64Array(vocab.length); tk.forEach((w) => { const i = index.get(w); if (i !== undefined) v[i] += 1; }); let s = 0; for (let i = 0; i < v.length; i++) { v[i] *= idf[i]; s += v[i] * v[i]; } s = Math.sqrt(s) || 1; for (let i = 0; i < v.length; i++) v[i] /= s; return v; };
    return { vocab, idf, X: toks.map(vec), transform: (text) => vec(out.tokenize(text).filter((w) => !stop.has(w))), tokens: (text) => out.tokenize(text).filter((w) => !stop.has(w)) };
  };

  return out;
});
