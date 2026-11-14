/* ml-embed.js: t-SNE (exact, as in scikit-learn) and a compact UMAP re-implementation, both steppable so pages can animate them.
 * t-SNE follows sklearn.manifold.TSNE(method='exact'): perplexity search, early exaggeration 12 for 250 iterations,
 * momentum 0.5 -> 0.8, delta-bar-delta gains, learning_rate='auto', PCA or random initialisation.
 * UMAP follows umap-learn's recipe (smooth kNN distances, fuzzy union, a/b curve fit, spectral init, edge-sampled SGD with
 * negative sampling, transform of new points) in a form small enough to run in the browser. It is not bit-identical to umap-learn.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { const core = require('./ml-core.js'); module.exports = Object.assign(core, factory(core)); }
  else root.ML = Object.assign(root.ML, factory(root.ML));
})(typeof self !== 'undefined' ? self : this, function (ML) {
  'use strict';
  const out = {};
  const EPS = 2.220446049250313e-16;

  /* ============================== t-SNE ============================== */
  /** Conditional probabilities by binary search on the precision, joint P (sums to 1). D2: flat squared distances. */
  out.tsneAffinities = function (D2, n, perplexity) {
    const P = new Float64Array(n * n), target = Math.log(perplexity), betas = new Float64Array(n), row = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let beta = 1, lo = -Infinity, hi = Infinity, H = 0;
      for (let step = 0; step < 100; step++) {
        let sum = 0; for (let j = 0; j < n; j++) { row[j] = j === i ? 0 : Math.exp(-D2[i * n + j] * beta); sum += row[j]; }
        if (sum < 1e-300) sum = 1e-300;
        let sdp = 0; for (let j = 0; j < n; j++) { row[j] /= sum; if (j !== i) sdp += D2[i * n + j] * row[j]; }
        H = Math.log(sum) + beta * sdp;
        const diff = H - target; if (Math.abs(diff) <= 1e-5) break;
        if (diff > 0) { lo = beta; beta = hi === Infinity ? beta * 2 : (beta + hi) / 2; } else { hi = beta; beta = lo === -Infinity ? beta / 2 : (beta + lo) / 2; }
      }
      betas[i] = beta; for (let j = 0; j < n; j++) P[i * n + j] = row[j];
    }
    let total = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const v = P[i * n + j] + P[j * n + i]; P[i * n + j] = v; P[j * n + i] = v; total += 2 * v; }
    total = Math.max(total, EPS);
    for (let k = 0; k < P.length; k++) P[k] = Math.max(P[k] / total, 0);
    return { P, betas, conditional: null };
  };

  class TSNE {
    /** X: rows; opts: perplexity, seed, init 'pca'|'random'|array, learningRate, earlyExaggeration, exploration (iterations of phase 1) */
    constructor(X, opts) {
      opts = opts || {}; const n = X.length; this.n = n;
      this.perplexity = Math.min(opts.perplexity == null ? 30 : opts.perplexity, Math.max(2, (n - 1) / 3));
      this.exag = opts.earlyExaggeration || 12; this.explore = opts.exploration == null ? 250 : opts.exploration;
      this.lr = opts.learningRate && opts.learningRate !== 'auto' ? opts.learningRate : Math.max(n / this.exag / 4, 50);
      const D2 = ML.sqDistMatrix(X); const aff = out.tsneAffinities(D2, n, this.perplexity);
      this.P = aff.P; this.betas = aff.betas; this.D2 = D2;
      const Y = new Float64Array(n * 2);
      if (Array.isArray(opts.init) || (opts.init && opts.init.length === n)) { for (let i = 0; i < n; i++) { Y[2 * i] = opts.init[i][0]; Y[2 * i + 1] = opts.init[i][1]; } }
      else if (opts.init === 'random') { const r = ML.rng(opts.seed == null ? 0 : opts.seed); for (let i = 0; i < Y.length; i++) Y[i] = 1e-4 * r.normal(); }
      else {
        const pc = ML.pca(X), Z = pc.transform(X, Math.min(2, X[0].length)); let m = 0, s = 0; for (const z of Z) m += z[0]; m /= n; for (const z of Z) s += (z[0] - m) * (z[0] - m); s = Math.sqrt(s / n) || 1;
        for (let i = 0; i < n; i++) { Y[2 * i] = Z[i][0] / s * 1e-4; Y[2 * i + 1] = (Z[i].length > 1 ? Z[i][1] : 0) / s * 1e-4; }
      }
      this.Y = Y; this.update = new Float64Array(n * 2); this.gains = new Float64Array(n * 2).fill(1);
      this.W = new Float64Array(n * n); this.iter = 0; this.kl = NaN;
    }
    get maxIter() { return 1000; }
    get phase() { return this.iter < this.explore ? 'early exaggeration' : 'refinement'; }
    /** one gradient step; returns nothing. Call kl() for the divergence. */
    step() {
      const n = this.n, Y = this.Y, P = this.P, W = this.W, grad = new Float64Array(n * 2);
      const exag = this.iter < this.explore ? this.exag : 1, momentum = this.iter < this.explore ? 0.5 : 0.8;
      let sumW = 0;
      for (let i = 0; i < n; i++) { const xi = Y[2 * i], yi = Y[2 * i + 1]; for (let j = i + 1; j < n; j++) { const dx = xi - Y[2 * j], dy = yi - Y[2 * j + 1]; const w = 1 / (1 + dx * dx + dy * dy); W[i * n + j] = w; W[j * n + i] = w; sumW += 2 * w; } }
      const inv = 1 / Math.max(sumW, EPS);
      for (let i = 0; i < n; i++) {
        const xi = Y[2 * i], yi = Y[2 * i + 1]; let gx = 0, gy = 0;
        for (let j = 0; j < n; j++) { if (j === i) continue; const w = W[i * n + j], q = Math.max(w * inv, EPS), c = (exag * P[i * n + j] - q) * w; gx += c * (xi - Y[2 * j]); gy += c * (yi - Y[2 * j + 1]); }
        grad[2 * i] = 4 * gx; grad[2 * i + 1] = 4 * gy;
      }
      const U = this.update, G = this.gains;
      for (let k = 0; k < 2 * n; k++) {
        G[k] = (U[k] * grad[k] < 0) ? G[k] + 0.2 : G[k] * 0.8; if (G[k] < 0.01) G[k] = 0.01;
        U[k] = momentum * U[k] - this.lr * grad[k] * G[k]; Y[k] += U[k];
      }
      this.iter++;
    }
    /** KL(P || Q) of the current map against the (unexaggerated) P */
    klDivergence() {
      const n = this.n, Y = this.Y; let sumW = 0; const w = new Float64Array(n * n);
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const dx = Y[2 * i] - Y[2 * j], dy = Y[2 * i + 1] - Y[2 * j + 1]; const v = 1 / (1 + dx * dx + dy * dy); w[i * n + j] = v; w[j * n + i] = v; sumW += 2 * v; }
      let kl = 0; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j) { const p = Math.max(this.P[i * n + j], EPS), q = Math.max(w[i * n + j] / sumW, EPS); kl += p * Math.log(p / q); }
      return kl;
    }
    /** run steps until `ms` milliseconds have passed or maxIter reached; returns true while more work remains */
    run(ms, maxIter) {
      const t0 = Date.now(); maxIter = maxIter || this.maxIter;
      do { if (this.iter >= maxIter) return false; this.step(); } while (Date.now() - t0 < ms);
      return this.iter < maxIter;
    }
    points() { const o = []; for (let i = 0; i < this.n; i++) o.push([this.Y[2 * i], this.Y[2 * i + 1]]); return o; }
    /** the bandwidth sigma_i = 1/sqrt(2 beta_i) of point i's Gaussian */
    sigma(i) { return Math.sqrt(1 / (2 * this.betas[i])); }
  }
  out.TSNE = TSNE;

  /** conditional Gaussian weights of point i (for display), the perplexity they imply, and sigma */
  out.tsneRow = function (D2, n, i, perplexity) {
    const aff = out.tsneAffinities(D2, n, perplexity), beta = aff.betas[i], w = new Float64Array(n); let s = 0;
    for (let j = 0; j < n; j++) { w[j] = j === i ? 0 : Math.exp(-D2[i * n + j] * beta); s += w[j]; }
    let H = 0; for (let j = 0; j < n; j++) { w[j] /= s; if (w[j] > 0) H -= w[j] * Math.log(w[j]); }
    return { w, sigma: Math.sqrt(1 / (2 * beta)), perplexity: Math.exp(H) };
  };

  /* ============================== UMAP ============================== */
  /** fit a, b of 1 / (1 + a x^(2b)) to the target membership curve (Levenberg-Marquardt, as scipy's curve_fit does) */
  out.umapAB = function (spread, minDist) {
    const xs = [], ys = []; for (let i = 0; i < 300; i++) { const x = spread * 3 * i / 299; xs.push(x); ys.push(x < minDist ? 1 : Math.exp(-(x - minDist) / spread)); }
    let a = 1, b = 1, lambda = 1e-3;
    const resid = (a, b) => { let s = 0; for (let i = 0; i < xs.length; i++) { const f = 1 / (1 + a * Math.pow(xs[i], 2 * b)); s += (f - ys[i]) * (f - ys[i]); } return s; };
    let cost = resid(a, b);
    for (let it = 0; it < 200; it++) {
      let jaa = 0, jab = 0, jbb = 0, ga = 0, gb = 0;
      for (let i = 0; i < xs.length; i++) {
        const x = xs[i], p = x > 0 ? Math.pow(x, 2 * b) : 0, f = 1 / (1 + a * p), r = f - ys[i];
        const da = -f * f * p, db = x > 0 ? -f * f * a * p * 2 * Math.log(x) : 0;
        jaa += da * da; jab += da * db; jbb += db * db; ga += da * r; gb += db * r;
      }
      let improved = false;
      for (let t = 0; t < 12; t++) {
        const A11 = jaa * (1 + lambda), A22 = jbb * (1 + lambda), det = A11 * A22 - jab * jab; if (Math.abs(det) < 1e-300) { lambda *= 10; continue; }
        const na = a - (A22 * ga - jab * gb) / det, nb = b - (-jab * ga + A11 * gb) / det;
        if (na > 0 && nb > 0) { const c2 = resid(na, nb); if (c2 < cost) { const dc = cost - c2; a = na; b = nb; cost = c2; lambda = Math.max(lambda / 3, 1e-12); improved = dc > 1e-14; break; } }
        lambda *= 4;
      }
      if (!improved) break;
    }
    return { a, b };
  };

  /** kNN graph with fuzzy membership strengths. D2: squared distances (n x n flat). k includes the point itself, as in umap-learn. */
  out.umapGraph = function (D2, n, k) {
    k = Math.min(k, n);
    const nbr = [], dst = [];
    for (let i = 0; i < n; i++) {
      const order = Array.from({ length: n }, (_, j) => j).sort((a, b) => (a === i ? -1 : b === i ? 1 : D2[i * n + a] - D2[i * n + b])).slice(0, k);
      nbr.push(order); dst.push(order.map((j) => (j === i ? 0 : Math.sqrt(D2[i * n + j]))));
    }
    const target = Math.log2(k), rho = new Float64Array(n), sigma = new Float64Array(n);
    const meanDist = ML.mean(dst.flat());
    for (let i = 0; i < n; i++) {
      const nz = dst[i].filter((d) => d > 0); rho[i] = nz.length ? nz[0] : 0;
      let lo = 0, hi = Infinity, mid = 1;
      for (let it = 0; it < 64; it++) {
        let ps = 0; for (let j = 1; j < k; j++) { const d = dst[i][j] - rho[i]; ps += d > 0 ? Math.exp(-d / mid) : 1; }
        if (Math.abs(ps - target) < 1e-5) break;
        if (ps > target) { hi = mid; mid = (lo + hi) / 2; } else { lo = mid; mid = hi === Infinity ? mid * 2 : (lo + hi) / 2; }
      }
      sigma[i] = mid; const mi = ML.mean(dst[i]); if (rho[i] > 0 && sigma[i] < 1e-3 * mi) sigma[i] = 1e-3 * mi; else if (rho[i] <= 0 && sigma[i] < 1e-3 * meanDist) sigma[i] = 1e-3 * meanDist;
    }
    const A = new Map(); // directed memberships keyed i*n+j
    for (let i = 0; i < n; i++) for (let jj = 0; jj < k; jj++) { const j = nbr[i][jj]; if (j === i) continue; const d = dst[i][jj] - rho[i]; A.set(i * n + j, d <= 0 || sigma[i] === 0 ? 1 : Math.exp(-d / sigma[i])); }
    const edges = [], seen = new Set();
    for (const [key, a] of A) { const i = Math.floor(key / n), j = key % n, lo = Math.min(i, j), hi = Math.max(i, j), kk = lo * n + hi; if (seen.has(kk)) continue; seen.add(kk); const b = A.get(j * n + i) || 0; const w = a + b - a * b; if (w > 0) edges.push([lo, hi, w]); }
    return { edges, nbr, dst, rho, sigma, k };
  };

  /** Spectral initialisation: eigenvectors 2 and 3 of the normalised adjacency (subspace iteration), scaled to [0, 10]. */
  function spectralInit(n, edges, rng) {
    const deg = new Float64Array(n); for (const [i, j, w] of edges) { deg[i] += w; deg[j] += w; }
    const dinv = deg.map((d) => (d > 0 ? 1 / Math.sqrt(d) : 0)), m = 4;
    let V = Array.from({ length: m }, () => Float64Array.from({ length: n }, () => rng.normal()));
    const triv = Float64Array.from(deg, (d) => Math.sqrt(d)), tn = Math.sqrt(ML.dot(triv, triv)) || 1; for (let i = 0; i < n; i++) triv[i] /= tn;
    const orth = () => { for (let a = 0; a < m; a++) { const v = V[a]; let c = ML.dot(v, triv); for (let i = 0; i < n; i++) v[i] -= c * triv[i]; for (let b = 0; b < a; b++) { c = ML.dot(v, V[b]); for (let i = 0; i < n; i++) v[i] -= c * V[b][i]; } let s = Math.sqrt(ML.dot(v, v)) || 1; for (let i = 0; i < n; i++) v[i] /= s; } };
    orth();
    for (let it = 0; it < 250; it++) {
      V = V.map((v) => { const o = new Float64Array(n); for (let i = 0; i < n; i++) o[i] = v[i]; for (const [i, j, w] of edges) { const c = w * dinv[i] * dinv[j]; o[i] += c * v[j]; o[j] += c * v[i]; } return o; });
      orth();
    }
    const E = []; for (let i = 0; i < n; i++) E.push([V[0][i] * dinv[i], V[1][i] * dinv[i]]);
    let mx = 0; for (const e of E) mx = Math.max(mx, Math.abs(e[0]), Math.abs(e[1])); if (!(mx > 0) || !isFinite(mx)) return null;
    const ex = 10 / mx; for (const e of E) { e[0] = e[0] * ex + 1e-4 * rng.normal(); e[1] = e[1] * ex + 1e-4 * rng.normal(); }
    for (let c = 0; c < 2; c++) { let lo = Infinity, hi = -Infinity; for (const e of E) { lo = Math.min(lo, e[c]); hi = Math.max(hi, e[c]); } for (const e of E) e[c] = (e[c] - lo) / (hi - lo || 1) * 10; }
    return E;
  }

  class UMAP {
    /** X rows; opts: nNeighbors, minDist, spread, nEpochs, seed, negativeSampleRate, init 'spectral'|'random'|'pca' */
    constructor(X, opts) {
      opts = opts || {}; const n = X.length; this.n = n; this.X = X;
      this.nNeighbors = Math.min(opts.nNeighbors || 15, n); this.minDist = opts.minDist == null ? 0.1 : opts.minDist; this.spread = opts.spread || 1;
      this.nEpochs = opts.nEpochs || 300; this.negRate = opts.negativeSampleRate || 5; this.seed = opts.seed == null ? 0 : opts.seed;
      this.rng = ML.rng(this.seed + 17);
      const ab = out.umapAB(this.spread, this.minDist); this.a = ab.a; this.b = ab.b;
      const D2 = opts.D2 || ML.sqDistMatrix(X); this.D2 = D2;
      this.graph = out.umapGraph(D2, n, this.nNeighbors);
      let edges = this.graph.edges, wmax = 0; for (const e of edges) wmax = Math.max(wmax, e[2]);
      edges = edges.filter((e) => e[2] >= wmax / this.nEpochs); this.edges = edges;
      let E = null;
      if ((opts.init || 'spectral') === 'spectral') E = spectralInit(n, edges, ML.rng(this.seed + 3));
      if (!E && opts.init === 'pca') { const pc = ML.pca(X), Z = pc.transform(X, 2); E = Z.map((z) => [z[0], z[1]]); for (let c = 0; c < 2; c++) { let lo = Infinity, hi = -Infinity; for (const e of E) { lo = Math.min(lo, e[c]); hi = Math.max(hi, e[c]); } for (const e of E) e[c] = (e[c] - lo) / (hi - lo || 1) * 10; } }
      if (!E) E = Array.from({ length: n }, () => [20 * this.rng() - 10, 20 * this.rng() - 10]);
      this.Y = new Float64Array(n * 2); for (let i = 0; i < n; i++) { this.Y[2 * i] = E[i][0]; this.Y[2 * i + 1] = E[i][1]; }
      const m = edges.length; this.eps = new Float64Array(m); this.nextS = new Float64Array(m); this.nextN = new Float64Array(m); this.epsN = new Float64Array(m);
      for (let e = 0; e < m; e++) { this.eps[e] = wmax / edges[e][2]; this.nextS[e] = this.eps[e]; this.epsN[e] = this.eps[e] / this.negRate; this.nextN[e] = this.epsN[e]; }
      this.epoch = 0;
    }
    get maxIter() { return this.nEpochs; }
    step() {
      if (this.epoch >= this.nEpochs) return;
      const n = this.n, Y = this.Y, a = this.a, b = this.b, alpha = 1 - this.epoch / this.nEpochs, m = this.edges.length, ep = this.epoch + 1, rng = this.rng;
      const clip = (v) => (v > 4 ? 4 : v < -4 ? -4 : v);
      for (let e = 0; e < m; e++) {
        if (this.nextS[e] > ep) continue;
        const i = this.edges[e][0], j = this.edges[e][1];
        let dx = Y[2 * i] - Y[2 * j], dy = Y[2 * i + 1] - Y[2 * j + 1], d2 = dx * dx + dy * dy;
        let gc = d2 > 0 ? (-2 * a * b * Math.pow(d2, b - 1)) / (a * Math.pow(d2, b) + 1) : 0;
        const gx = clip(gc * dx) * alpha, gy = clip(gc * dy) * alpha;
        Y[2 * i] += gx; Y[2 * i + 1] += gy; Y[2 * j] -= gx; Y[2 * j + 1] -= gy;
        this.nextS[e] += this.eps[e];
        const nneg = Math.floor((ep - this.nextN[e]) / this.epsN[e]);
        for (let p = 0; p < nneg; p++) {
          const k = Math.floor(rng() * n); if (k === i) continue;
          dx = Y[2 * i] - Y[2 * k]; dy = Y[2 * i + 1] - Y[2 * k + 1]; d2 = dx * dx + dy * dy;
          gc = d2 > 0 ? (2 * b) / ((0.001 + d2) * (a * Math.pow(d2, b) + 1)) : 0;
          if (gc > 0) { Y[2 * i] += clip(gc * dx) * alpha; Y[2 * i + 1] += clip(gc * dy) * alpha; } else { Y[2 * i] += 4 * alpha; Y[2 * i + 1] += 4 * alpha; }
        }
        this.nextN[e] += nneg * this.epsN[e];
      }
      this.epoch++;
    }
    run(ms) { const t0 = Date.now(); do { if (this.epoch >= this.nEpochs) return false; this.step(); } while (Date.now() - t0 < ms); return this.epoch < this.nEpochs; }
    points() { const o = []; for (let i = 0; i < this.n; i++) o.push([this.Y[2 * i], this.Y[2 * i + 1]]); return o; }
    /** place new points (rows of Xnew) among the fitted ones, as umap-learn's transform does */
    transform(Xnew, epochs) {
      const n = this.n, k = this.nNeighbors, E = this.points(), out2 = [], a = this.a, b = this.b, rng = ML.rng(this.seed + 99);
      epochs = epochs || 100;
      const clip = (v) => (v > 4 ? 4 : v < -4 ? -4 : v);
      const res = Xnew.map((x) => {
        const d = this.X.map((t, j) => [Math.sqrt(ML.sqdist(x, t)), j]).sort((p, q) => p[0] - q[0]).slice(0, k);
        const rho = d.find((v) => v[0] > 0) ? d.find((v) => v[0] > 0)[0] : 0, target = Math.log2(k);
        let lo = 0, hi = Infinity, mid = 1;
        for (let it = 0; it < 64; it++) { let ps = 0; for (let j = 0; j < k; j++) { const dd = d[j][0] - rho; ps += dd > 0 ? Math.exp(-dd / mid) : 1; } if (Math.abs(ps - target) < 1e-5) break; if (ps > target) { hi = mid; mid = (lo + hi) / 2; } else { lo = mid; mid = hi === Infinity ? mid * 2 : (lo + hi) / 2; } }
        const w = d.map((v) => { const dd = v[0] - rho; return dd <= 0 ? 1 : Math.exp(-dd / mid); });
        let ws = w.reduce((s, v) => s + v, 0) || 1, pos = [0, 0]; d.forEach((v, q) => { pos[0] += w[q] / ws * E[v[1]][0]; pos[1] += w[q] / ws * E[v[1]][1]; });
        return { d, w, pos };
      });
      let wmax = 0; res.forEach((r) => r.w.forEach((v) => { wmax = Math.max(wmax, v); }));
      res.forEach((r) => {
        const p = r.pos.slice(), cands = r.d.map((v, q) => ({ j: v[1], w: r.w[q] })).filter((c) => c.w >= wmax / epochs);
        for (let ep = 0; ep < epochs; ep++) {
          const alpha = 0.25 * (1 - ep / epochs);
          for (const c of cands) {
            if (ep % Math.max(1, Math.round(wmax / c.w)) !== 0) continue;
            let dx = p[0] - E[c.j][0], dy = p[1] - E[c.j][1], d2 = dx * dx + dy * dy;
            let gc = d2 > 0 ? (-2 * a * b * Math.pow(d2, b - 1)) / (a * Math.pow(d2, b) + 1) : 0; p[0] += clip(gc * dx) * alpha; p[1] += clip(gc * dy) * alpha;
            for (let q = 0; q < this.negRate; q++) { const kk = Math.floor(rng() * n); dx = p[0] - E[kk][0]; dy = p[1] - E[kk][1]; d2 = dx * dx + dy * dy; gc = d2 > 0 ? (2 * b) / ((0.001 + d2) * (a * Math.pow(d2, b) + 1)) : 0; if (gc > 0) { p[0] += clip(gc * dx) * alpha; p[1] += clip(gc * dy) * alpha; } else { p[0] += 4 * alpha; p[1] += 4 * alpha; } }
          }
        }
        out2.push(p);
      });
      return out2;
    }
  }
  out.UMAP = UMAP;

  return out;
});
