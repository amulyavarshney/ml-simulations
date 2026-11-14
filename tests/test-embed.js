// node tests/test-embed.js : t-SNE against scikit-learn (same init), UMAP a/b against scipy, UMAP sanity properties
global.self = global; const ML = require('../assets/ml-embed.js'); const ref = require('./reference_embed.json');
let fails = 0; const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); if (!cond) fails++; };
const n = ref.X.length, X = ref.X.map(r => Float64Array.from(r));
const t = new ML.TSNE(X, { perplexity: 15, init: ref.init });
let d = 0; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) d = Math.max(d, Math.abs(t.P[i * n + j] - ref.P_full[i][j]));
ok('t-SNE joint probabilities P equal sklearn', d < 1e-6, 'max diff ' + d.toExponential(2));
const cmp = (Y, R) => { let m = 0; for (let i = 0; i < n; i++) m = Math.max(m, Math.abs(Y[2 * i] - R[i][0]), Math.abs(Y[2 * i + 1] - R[i][1])); return m; };
t.step(); ok('t-SNE iteration 1 equals scikit-learn\'s gradient and update rule', cmp(t.Y, ref.replay_Y1) < 1e-8, 'max diff ' + cmp(t.Y, ref.replay_Y1).toExponential(2));
for (let i = 1; i < 10; i++) t.step(); ok('t-SNE iteration 10 equals scikit-learn\'s rule (before chaos amplifies rounding)', cmp(t.Y, ref.replay_Y10) < 1e-3, 'max diff ' + cmp(t.Y, ref.replay_Y10).toExponential(2));
for (let i = 10; i < 1000; i++) t.step();
const kl = t.klDivergence(), [lo, hi] = ref.kl_spread;
ok('t-SNE final KL lies in the spread scikit-learn itself shows under 1e-9 perturbations', kl > 0.93 * Math.min(lo, ref.kl1000) && kl < 1.07 * hi, 'spread [' + lo.toFixed(4) + ', ' + hi.toFixed(4) + '], sklearn run ' + ref.kl1000.toFixed(4) + ': t-SNE is chaotic, so even reordering one multiplication changes the final layout, so quality, not exact positions, is what can be compared');
for (const [md, ab] of Object.entries(ref.ab)) { const r = ML.umapAB(1, +md); ok('UMAP a, b for min_dist=' + md, Math.abs(r.a - ab[0]) < 2e-3 * ab[0] && Math.abs(r.b - ab[1]) < 2e-3 * ab[1], 'a=' + r.a.toFixed(4) + ' b=' + r.b.toFixed(4) + ' vs ' + ab[0].toFixed(4) + ', ' + ab[1].toFixed(4)); }
// UMAP properties on a swiss roll
const rng = ML.rng(1), sr = ML.data.swissRoll(300, 0.0, rng), Xs = sr.X.map(r => Float64Array.from(r));
const D2 = ML.sqDistMatrix(Xs), g = ML.umapGraph(D2, 300, 15);
let worst = 0; for (let i = 0; i < 300; i++) { let s = 0; for (let jj = 1; jj < 15; jj++) { const dd = g.dst[i][jj] - g.rho[i]; s += dd > 0 ? Math.exp(-dd / g.sigma[i]) : 1; } worst = Math.max(worst, Math.abs(s - Math.log2(15))); }
ok('UMAP smooth-kNN: memberships of each point sum to log2(k)', worst < 1e-3, 'worst deviation ' + worst.toExponential(2));
const t0 = Date.now(); const u = new ML.UMAP(Xs, { nNeighbors: 15, minDist: 0.1, nEpochs: 300, seed: 0 }); while (u.run(50));
const pc = ML.pca(Xs).transform(Xs, 2), tw = (E) => ML.trustworthiness(Xs, E, 10);
ok('UMAP unrolls a swiss roll better than PCA (trustworthiness)', tw(u.points()) > tw(pc) + 0.005, 'UMAP ' + tw(u.points()).toFixed(3) + ' vs PCA ' + tw(pc).toFixed(3) + ' in ' + (Date.now() - t0) + ' ms');
const ts = new ML.TSNE(Xs, { perplexity: 30 }); const t1 = Date.now(); while (ts.run(100, 1000));
ok('t-SNE unrolls a swiss roll better than PCA (trustworthiness)', tw(ts.points()) > tw(pc) + 0.005, 't-SNE ' + tw(ts.points()).toFixed(3) + ' in ' + (Date.now() - t1) + ' ms (n=300)');
const tr = u.transform(Xs.slice(0, 5).map(r => r.map(v => v + 0.01))), E = u.points();
ok('UMAP.transform puts a slightly perturbed training point near its original', tr.every((p, i) => Math.hypot(p[0] - E[i][0], p[1] - E[i][1]) < 1.5), tr.map((p, i) => Math.hypot(p[0] - E[i][0], p[1] - E[i][1]).toFixed(2)).join(' '));
process.exit(fails ? 1 : 0);
