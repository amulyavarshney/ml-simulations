/* ml-core.js: small, dependency-free numerical core for the simulations.
 * Random numbers, linear algebra, PCA, data generators, neighbourhood metrics, cross-validation.
 * Works in the browser (window.ML) and in Node (module.exports) so tests/ can check it against scikit-learn.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ML = Object.assign(root.ML || {}, factory());
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const ML = {};

  /* ---------- random numbers (mulberry32) ---------- */
  ML.rng = function (seed) {
    let a = (seed >>> 0) || 1;
    const r = function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.normal = function () {
      let u = 0; while (u === 0) u = r();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
    };
    r.int = (n) => Math.floor(r() * n);
    r.shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; };
    return r;
  };

  /* ---------- small vector / matrix helpers (rows are arrays or Float64Arrays) ---------- */
  const dot = ML.dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
  ML.sqdist = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) { const t = a[i] - b[i]; s += t * t; } return s; };
  ML.colMeans = function (X) {
    const n = X.length, d = X[0].length, m = new Float64Array(d);
    for (let i = 0; i < n; i++) for (let j = 0; j < d; j++) m[j] += X[i][j];
    for (let j = 0; j < d; j++) m[j] /= n; return m;
  };
  ML.colStd = function (X, mean, ddof) { // population std (ddof 0) like StandardScaler
    const n = X.length, d = X[0].length, s = new Float64Array(d); mean = mean || ML.colMeans(X);
    for (let i = 0; i < n; i++) for (let j = 0; j < d; j++) { const t = X[i][j] - mean[j]; s[j] += t * t; }
    for (let j = 0; j < d; j++) s[j] = Math.sqrt(s[j] / (n - (ddof || 0))); return s;
  };
  ML.variance = function (arr) { let m = 0; for (const v of arr) m += v; m /= arr.length; let s = 0; for (const v of arr) s += (v - m) * (v - m); return s / arr.length; };
  ML.zeros = (n) => new Float64Array(n);
  ML.argsort = (arr, desc) => Array.from(arr.keys()).sort((i, j) => desc ? arr[j] - arr[i] : arr[i] - arr[j]);

  /** Standardiser fitted on `X`. */
  ML.scaler = function (X, doScale) {
    const mean = ML.colMeans(X), std = ML.colStd(X, mean);
    for (let j = 0; j < std.length; j++) if (!(std[j] > 1e-12)) std[j] = 1;
    const f = (x) => { const o = new Float64Array(x.length); for (let j = 0; j < x.length; j++) o[j] = (x[j] - mean[j]) / (doScale === false ? 1 : std[j]); return o; };
    return { mean, std, transform: (X2) => X2.map(f), apply: f };
  };

  /** Symmetric eigendecomposition by cyclic Jacobi. Returns eigenvalues (descending) and eigenvectors as rows. */
  ML.eigSym = function (A0) {
    const n = A0.length, A = A0.map((r) => Float64Array.from(r));
    const V = Array.from({ length: n }, (_, i) => { const r = new Float64Array(n); r[i] = 1; return r; });
    let scale = 0; for (let i = 0; i < n; i++) scale += A[i][i] * A[i][i];
    for (let sweep = 0; sweep < 60; sweep++) {
      let off = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += A[i][j] * A[i][j];
      if (off <= 1e-26 * (scale + 1e-300)) break;
      for (let p = 0; p < n - 1; p++) for (let q = p + 1; q < n; q++) {
        const apq = A[p][q]; if (Math.abs(apq) < 1e-300) continue;
        const theta = (A[q][q] - A[p][p]) / (2 * apq);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1), s = t * c;
        for (let k = 0; k < n; k++) { const akp = A[k][p], akq = A[k][q]; A[k][p] = c * akp - s * akq; A[k][q] = s * akp + c * akq; }
        for (let k = 0; k < n; k++) { const apk = A[p][k], aqk = A[q][k]; A[p][k] = c * apk - s * aqk; A[q][k] = s * apk + c * aqk; }
        for (let k = 0; k < n; k++) { const vp = V[k][p], vq = V[k][q]; V[k][p] = c * vp - s * vq; V[k][q] = s * vp + c * vq; }
      }
    }
    const order = ML.argsort(Array.from({ length: n }, (_, i) => A[i][i]), true);
    const values = order.map((i) => A[i][i]);
    const vectors = order.map((i) => { const v = new Float64Array(n); let big = 0; for (let k = 0; k < n; k++) { v[k] = V[k][i]; if (Math.abs(v[k]) > Math.abs(big)) big = v[k]; } if (big < 0) for (let k = 0; k < n; k++) v[k] = -v[k]; return v; });
    return { values, vectors };
  };

  /** Thin SVD of an n x d matrix by one-sided Jacobi (Hestenes). Good for small d. Returns {s, Vt (rows), U (columns as rows)}. */
  ML.svd = function (X) {
    const n = X.length, d = X[0].length;
    const U = Array.from({ length: d }, (_, j) => { const c = new Float64Array(n); for (let i = 0; i < n; i++) c[i] = X[i][j]; return c; });
    const V = Array.from({ length: d }, (_, i) => { const r = new Float64Array(d); r[i] = 1; return r; });
    for (let sweep = 0; sweep < 60; sweep++) {
      let rotated = false;
      for (let p = 0; p < d - 1; p++) for (let q = p + 1; q < d; q++) {
        let al = 0, be = 0, ga = 0; const up = U[p], uq = U[q];
        for (let i = 0; i < n; i++) { al += up[i] * up[i]; be += uq[i] * uq[i]; ga += up[i] * uq[i]; }
        if (Math.abs(ga) <= 1e-15 * Math.sqrt(al * be) || Math.abs(ga) < 1e-300) continue;
        rotated = true;
        const zeta = (be - al) / (2 * ga), t = Math.sign(zeta || 1) / (Math.abs(zeta) + Math.sqrt(1 + zeta * zeta));
        const c = 1 / Math.sqrt(1 + t * t), s = c * t;
        for (let i = 0; i < n; i++) { const a = up[i], b = uq[i]; up[i] = c * a - s * b; uq[i] = s * a + c * b; }
        const vp = V[p], vq = V[q];
        for (let i = 0; i < d; i++) { const a = vp[i], b = vq[i]; vp[i] = c * a - s * b; vq[i] = s * a + c * b; }
      }
      if (!rotated) break;
    }
    const sv = U.map((c) => Math.sqrt(dot(c, c)));
    const order = ML.argsort(sv, true);
    const s = order.map((i) => sv[i]);
    const Vt = order.map((i) => { const r = Float64Array.from(V[i]); let big = 0; for (const v of r) if (Math.abs(v) > Math.abs(big)) big = v; if (big < 0) for (let k = 0; k < d; k++) r[k] = -r[k]; return r; });
    return { s, Vt };
  };

  /* ---------- PCA ---------- */
  /** PCA through the covariance matrix. opts.scale: standardise columns first. Mirrors scikit-learn (ddof = n - 1). */
  ML.pca = function (X, opts) {
    opts = opts || {};
    const n = X.length, d = X[0].length;
    const mean = ML.colMeans(X);
    let std = new Float64Array(d).fill(1);
    if (opts.scale) { std = ML.colStd(X, mean); for (let j = 0; j < d; j++) if (!(std[j] > 1e-12)) std[j] = 1; }
    const Z = X.map((r) => { const o = new Float64Array(d); for (let j = 0; j < d; j++) o[j] = (r[j] - mean[j]) / std[j]; return o; });
    const C = Array.from({ length: d }, () => new Float64Array(d));
    for (let i = 0; i < n; i++) { const z = Z[i]; for (let a = 0; a < d; a++) { const za = z[a], row = C[a]; for (let b = a; b < d; b++) row[b] += za * z[b]; } }
    for (let a = 0; a < d; a++) for (let b = a; b < d; b++) { C[a][b] /= (n - 1); C[b][a] = C[a][b]; }
    const { values, vectors } = ML.eigSym(C);
    const total = values.reduce((s, v) => s + Math.max(v, 0), 0);
    const ratio = values.map((v) => Math.max(v, 0) / total);
    const cum = []; let c = 0; for (const r of ratio) { c += r; cum.push(c); }
    const model = {
      n, d, mean, std, values, ratio, cum, components: vectors, total,
      standardise(x) { const o = new Float64Array(d); for (let j = 0; j < d; j++) o[j] = (x[j] - mean[j]) / std[j]; return o; },
      project(x, k) { const z = model.standardise(x), o = new Float64Array(k); for (let a = 0; a < k; a++) o[a] = dot(z, vectors[a]); return o; },
      transform(rows, k) { return rows.map((x) => model.project(x, k)); },
      /** map coordinates (length k) back to the original feature space */
      inverse(s, k) { const o = new Float64Array(d); for (let a = 0; a < k; a++) { const v = vectors[a]; for (let j = 0; j < d; j++) o[j] += s[a] * v[j]; } for (let j = 0; j < d; j++) o[j] = o[j] * std[j] + mean[j]; return o; },
      reconstruct(x, k) { return model.inverse(model.project(x, k), k); },
      /** smallest k whose cumulative ratio reaches `target` */
      kFor(target) { for (let i = 0; i < cum.length; i++) if (cum[i] >= target - 1e-12) return i + 1; return cum.length; },
    };
    return model;
  };

  /* ---------- pairwise distances and neighbourhood metrics ---------- */
  ML.sqDistMatrix = function (X) {
    const n = X.length, D = new Float64Array(n * n);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const v = ML.sqdist(X[i], X[j]); D[i * n + j] = v; D[j * n + i] = v; }
    return D;
  };
  /** k nearest neighbours (indices) of every row, excluding itself. */
  ML.knn = function (X, k, D2) {
    const n = X.length; D2 = D2 || ML.sqDistMatrix(X);
    const idx = [], dist = [];
    for (let i = 0; i < n; i++) {
      const order = Array.from({ length: n }, (_, j) => j).filter((j) => j !== i).sort((a, b) => D2[i * n + a] - D2[i * n + b]).slice(0, k);
      idx.push(order); dist.push(order.map((j) => Math.sqrt(D2[i * n + j])));
    }
    return { idx, dist };
  };
  /** Trustworthiness (scikit-learn definition): are the embedding's k nearest neighbours also close in the original space? */
  ML.trustworthiness = function (X, E, k) {
    const n = X.length; k = k || 10;
    const DX = ML.sqDistMatrix(X), rank = new Int32Array(n * n);
    for (let i = 0; i < n; i++) {
      const order = Array.from({ length: n }, (_, j) => j).filter((j) => j !== i).sort((a, b) => DX[i * n + a] - DX[i * n + b]);
      for (let r = 0; r < order.length; r++) rank[i * n + order[r]] = r + 1;
    }
    const nnE = ML.knn(E, k).idx;
    let t = 0;
    for (let i = 0; i < n; i++) for (const j of nnE[i]) { const r = rank[i * n + j] - k; if (r > 0) t += r; }
    return 1 - t * (2 / (n * k * (2 * n - 3 * k - 1)));
  };
  /** Fraction of each point's k nearest neighbours (in the embedding) that share its label (k-NN purity). */
  ML.neighbourPurity = function (E, labels, k) {
    const nn = ML.knn(E, k || 10).idx; let s = 0, c = 0;
    for (let i = 0; i < nn.length; i++) for (const j of nn[i]) { s += labels[i] === labels[j] ? 1 : 0; c++; }
    return s / c;
  };
  /** Orthogonal Procrustes alignment of B onto A (rotation/reflection, translation, scaling off). Returns aligned copy of B. */
  ML.procrustes = function (A, B) {
    const n = A.length, ma = ML.colMeans(A), mb = ML.colMeans(B);
    let a11 = 0, a12 = 0, a21 = 0, a22 = 0;
    for (let i = 0; i < n; i++) { const ax = A[i][0] - ma[0], ay = A[i][1] - ma[1], bx = B[i][0] - mb[0], by = B[i][1] - mb[1]; a11 += bx * ax; a12 += bx * ay; a21 += by * ax; a22 += by * ay; }
    // M = B^T A (2x2); optimal R = U V^T from SVD of M
    const M = [[a11, a12], [a21, a22]];
    const MtM = [[M[0][0] * M[0][0] + M[1][0] * M[1][0], M[0][0] * M[0][1] + M[1][0] * M[1][1]], [M[0][1] * M[0][0] + M[1][1] * M[1][0], M[0][1] * M[0][1] + M[1][1] * M[1][1]]];
    const { values, vectors } = ML.eigSym(MtM);
    const V = vectors, s = values.map((v) => Math.sqrt(Math.max(v, 0)));
    const Ucols = V.map((v, i) => { const u = [M[0][0] * v[0] + M[0][1] * v[1], M[1][0] * v[0] + M[1][1] * v[1]]; const sc = s[i] > 1e-12 ? 1 / s[i] : 0; return [u[0] * sc, u[1] * sc]; });
    // M = B^T A = U S V^T, so the rotation that carries B onto A is R = V U^T, which is the transpose of U V^T
    const Q = [[0, 0], [0, 0]]; for (let i = 0; i < 2; i++) for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) Q[a][b] += Ucols[i][a] * V[i][b];
    const R = [[Q[0][0], Q[1][0]], [Q[0][1], Q[1][1]]];
    return B.map((p) => { const x = p[0] - mb[0], y = p[1] - mb[1]; return [R[0][0] * x + R[0][1] * y + ma[0], R[1][0] * x + R[1][1] * y + ma[1]]; });
  };

  /* ---------- data generators (own RNG; shapes follow scikit-learn's recipes) ---------- */
  const D = ML.data = {};
  D.blobs = function (centers, counts, stds, rng) {
    const X = [], y = [];
    centers.forEach((c, k) => { const m = Array.isArray(counts) ? counts[k] : counts, s = Array.isArray(stds) ? stds[k] : stds; for (let i = 0; i < m; i++) { X.push(c.map((v) => v + s * rng.normal())); y.push(k); } });
    return { X, y };
  };
  D.moons = function (n, noise, rng) {
    const a = Math.floor(n / 2), b = n - a, X = [], y = [];
    for (let i = 0; i < a; i++) { const t = Math.PI * i / Math.max(a - 1, 1); X.push([Math.cos(t) + noise * rng.normal(), Math.sin(t) + noise * rng.normal()]); y.push(0); }
    for (let i = 0; i < b; i++) { const t = Math.PI * i / Math.max(b - 1, 1); X.push([1 - Math.cos(t) + noise * rng.normal(), 0.5 - Math.sin(t) + noise * rng.normal()]); y.push(1); }
    return { X, y };
  };
  D.circles = function (n, noise, factor, rng) {
    const a = Math.floor(n / 2), b = n - a, X = [], y = [];
    for (let i = 0; i < a; i++) { const t = 2 * Math.PI * i / a; X.push([Math.cos(t) + noise * rng.normal(), Math.sin(t) + noise * rng.normal()]); y.push(0); }
    for (let i = 0; i < b; i++) { const t = 2 * Math.PI * i / b; X.push([factor * Math.cos(t) + noise * rng.normal(), factor * Math.sin(t) + noise * rng.normal()]); y.push(1); }
    return { X, y };
  };
  D.xor = function (n, noise, rng) {
    const X = [], y = [];
    for (let i = 0; i < n; i++) { const sx = rng() < 0.5 ? -1 : 1, sy = rng() < 0.5 ? -1 : 1; X.push([sx * (0.4 + 0.8 * rng()) + noise * rng.normal(), sy * (0.4 + 0.8 * rng()) + noise * rng.normal()]); y.push(sx * sy > 0 ? 1 : 0); }
    return { X, y };
  };
  D.spiral = function (n, noise, rng) {
    const X = [], y = [], h = Math.floor(n / 2);
    for (let c = 0; c < 2; c++) for (let i = 0; i < h; i++) { const r = 0.15 + 1.6 * i / h, t = 1.75 * Math.PI * i / h * 1.0 + c * Math.PI; X.push([r * Math.cos(t) + noise * rng.normal(), r * Math.sin(t) + noise * rng.normal()]); y.push(c); }
    return { X, y };
  };
  D.swissRoll = function (n, noise, rng) {
    const X = [], t = [];
    for (let i = 0; i < n; i++) { const tt = 1.5 * Math.PI * (1 + 2 * rng()); X.push([tt * Math.cos(tt) + noise * rng.normal(), 21 * rng() + noise * rng.normal(), tt * Math.sin(tt) + noise * rng.normal()]); t.push(tt); }
    return { X, t };
  };
  /** wine and digits (real data, exported from scikit-learn in assets/data) */
  D.wine = function () {
    const w = (typeof self !== 'undefined' ? self : globalThis).MLDATA.wine;
    return { X: w.X.map((r) => Float64Array.from(r)), y: w.target.slice(), features: w.features, classNames: w.classNames };
  };
  D.digits = function () {
    const g = (typeof self !== 'undefined' ? self : globalThis).MLDATA.digits, X = [], y = [];
    for (let i = 0; i < g.n; i++) { const r = new Float64Array(g.d); for (let j = 0; j < g.d; j++) r[j] = parseInt(g.pixels[i * g.d + j], 17); X.push(r); y.push(+g.target[i]); }
    return { X, y };
  };

  /* ---------- cross-validation ---------- */
  /** StratifiedKFold(n_splits) without shuffling, same allocation rule as scikit-learn. Returns array of test-index arrays. */
  ML.stratifiedFolds = function (y, k) {
    const classes = Array.from(new Set(y)).sort((a, b) => a - b), ysorted = y.slice().sort((a, b) => a - b);
    const alloc = Array.from({ length: k }, () => new Array(classes.length).fill(0));
    for (let f = 0; f < k; f++) for (let i = f; i < ysorted.length; i += k) alloc[f][classes.indexOf(ysorted[i])]++;
    const fold = new Array(y.length);
    classes.forEach((c, ci) => { const seq = []; for (let f = 0; f < k; f++) for (let r = 0; r < alloc[f][ci]; r++) seq.push(f); let p = 0; for (let i = 0; i < y.length; i++) if (y[i] === c) fold[i] = seq[p++]; });
    const out = Array.from({ length: k }, () => []); fold.forEach((f, i) => out[f].push(i)); return out;
  };
  ML.pick = (arr, idx) => idx.map((i) => arr[i]);
  ML.mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  ML.std = (a) => { const m = ML.mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) * (v - m), 0) / a.length); };

  /* ---------- nice numbers ---------- */
  ML.niceTicks = function (lo, hi, count) {
    count = count || 5; const span = hi - lo; if (!(span > 0)) return [lo];
    const raw = span / count, mag = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / mag;
    const step = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * mag, out = [];
    for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + 1e-9; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : +v.toPrecision(12));
    return out;
  };

  return ML;
});
