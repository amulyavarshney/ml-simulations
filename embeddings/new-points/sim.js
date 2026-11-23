/* New points: UMAP.transform places unseen digits on an existing map; t-SNE has no transform, so a refit moves old points. */
(function () {
  'use strict';
  const { stage, side } = UI.shell('embeddings/new-points');
  const h = UI.h;
  let nn = 15, showTrain = true, showTest = true, showArrows = true, seed = 1, gen = 0, umapAnim = null, tsneAnim = null, refitAnim = null;
  const all = EU.digitsSubset(40, 31), nTr = 30, tr = [], te = [];
  const perClass = {}; all.y.forEach((c, i) => { (perClass[c] = perClass[c] || []).push(i); });
  Object.values(perClass).forEach((l) => { l.forEach((i, j) => (j < nTr ? tr : te).push(i)); });
  const Xtr = tr.map((i) => all.X[i]), ytr = tr.map((i) => all.y[i]), Xte = te.map((i) => all.X[i]), yte = te.map((i) => all.y[i]);
  let Eu = [], Eu_te = [], Et = [], Etr_new = [], disp = null, state = { umap: false, tsne: false };

  const knnAcc = (Etrain, ytrain, Etest, ytest, k) => { let ok = 0; Etest.forEach((q, i) => { const order = Etrain.map((p, j) => [(p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2, j]).sort((a, b) => a[0] - b[0]).slice(0, k), votes = {}; order.forEach(([, j]) => { votes[ytrain[j]] = (votes[ytrain[j]] || 0) + 1; }); const best = Object.keys(votes).sort((a, b) => votes[b] - votes[a])[0]; if (+best === ytest[i]) ok++; }); return ok / Etest.length; };
  const knnAccHD = (Xa, ya, Xb, yb, k) => { let ok = 0; Xb.forEach((q, i) => { const order = Xa.map((p, j) => [ML.sqdist(p, q), j]).sort((a, b) => a[0] - b[0]).slice(0, k), votes = {}; order.forEach(([, j]) => { votes[ya[j]] = (votes[ya[j]] || 0) + 1; }); if (+Object.keys(votes).sort((a, b) => votes[b] - votes[a])[0] === yb[i]) ok++; }); return ok / Xb.length; };
  const baseline = knnAccHD(Xtr, ytr, Xte, yte, 10);

  const c = UI.panel(side, 'Controls');
  UI.slider(c, { label: 'UMAP n_neighbors', min: 3, max: 50, step: 1, value: nn, fmt: (v) => String(Math.round(v)), onInput: UI.debounce((v) => { nn = Math.round(v); runUmap(); }, 250) });
  UI.check(c, { label: 'Show training digits', value: true, onChange(v) { showTrain = v; redraw(); } });
  UI.check(c, { label: 'Show transformed test digits (circled)', value: true, onChange(v) { showTest = v; redraw(); } });
  EU.speedControl(c);
  UI.buttons(c, [{ label: 'New seed', onClick() { seed++; runUmap(); runTsne(); } }]);
  UI.note(c, 'New seed changes the UMAP start. The t-SNE map starts from PCA and does not depend on the seed, so its picture stays the same.');
  const t = UI.panel(side, 't-SNE has no transform');
  UI.note(t, 'To place the test digits with t-SNE you must refit on training + test together.');
  UI.check(t, { label: 'Draw arrows: old position → refitted position', value: true, onChange(v) { showArrows = v; tmap.plot.redraw(); } });
  const bt = UI.buttons(t, [{ id: 'refit', label: 'Refit t-SNE with the test points', primary: true, onClick() { refit(); } }]);
  const rd = UI.panel(side, 'Readouts'), R = UI.read(rd, [{ id: 'base', label: 'Test accuracy, 10-NN on the 64 pixels' }, { id: 'u', label: 'Test accuracy, 10-NN on UMAP coordinates' }, { id: 'ut', label: 'Training points moved by transform' }, { id: 'tm', label: 't-SNE: median move of a training point' }]);
  R.set('base', UI.pct(baseline, 0)); R.set('ut', '…'); R.set('tm', 'press the button');
  const pg = UI.progress(rd);

  const row = h('div', { class: 'row' }); stage.append(row);
  const umapCard = EU.mapCard(row, 'UMAP: fitted on 300 training digits, then test digits transformed', '', { aspect: 1.1 }), tmap = EU.mapCard(row, 't-SNE: training digits only (then refitted with test)', '', { aspect: 1.1 });
  EU.digitLegend(stage);
  const redraw = () => { umapCard.plot.redraw(); tmap.plot.redraw(); };
  umapCard.plot.draw = (p) => {
    const col = p.col, pts = Eu.concat(showTest ? Eu_te : []); if (!pts.length) return; EU.fit(p, pts); EU.frame(p);
    if (showTrain) EU.drawMap(p, Eu, { kind: 'digit', labels: ytr, size: 10, alpha: showTest ? 0.45 : 0.95 }); else EU.fit(p, pts);
    if (showTest && Eu_te.length) { Eu_te.forEach((q, i) => { p.ring(q[0], q[1], 8.5, { color: col.c[yte[i] % 8], w: 1.8 }); }); EU.drawMap(p, Eu_te, { kind: 'digit', labels: yte, size: 12, alpha: 1 }); EU.fit(p, pts); }
    p.setLabel('UMAP map of training digits with transformed test digits circled');
  };
  tmap.plot.draw = (p) => {
    const col = p.col, shown = Etr_new.length ? Etr_new : Et; if (!shown.length) return; const lim = Et.concat(Etr_new.length ? disp.aligned : []); EU.fit(p, lim);
    EU.frame(p);
    if (Etr_new.length) {
      if (showArrows) { const c2 = p.ctx; c2.save(); c2.beginPath(); c2.rect(p.m.l, p.m.t, p.pw, p.ph); c2.clip(); c2.strokeStyle = col.c[1]; c2.globalAlpha = 0.5; c2.lineWidth = 1.2; Et.forEach((q, i) => { c2.beginPath(); c2.moveTo(p.X(q[0]), p.Y(q[1])); c2.lineTo(p.X(disp.aligned[i][0]), p.Y(disp.aligned[i][1])); c2.stroke(); }); c2.restore(); }
      EU.drawMap(p, Et, { kind: 'digit', labels: ytr, size: 10, alpha: 0.3 }); EU.drawMap(p, disp.aligned, { kind: 'digit', labels: ytr, size: 10, alpha: 0.95 }); EU.fit(p, lim);
      if (disp.testAligned) { disp.testAligned.forEach((q, i) => p.ring(q[0], q[1], 8, { color: col.c[yte[i] % 8], w: 1.6 })); EU.drawMap(p, disp.testAligned, { kind: 'digit', labels: yte, size: 11.5, alpha: 1 }); EU.fit(p, lim); }
    } else EU.drawMap(p, Et, { kind: 'digit', labels: ytr, size: 10 });
    p.setLabel('t-SNE map of training digits' + (Etr_new.length ? ' and their positions after refitting with the test digits' : ''));
  };
  function runUmap() {
    const my = ++gen; if (umapAnim) umapAnim.stop(); Eu_te = []; R.set('u', '…');
    const u = new ML.UMAP(Xtr, { nNeighbors: nn, minDist: 0.1, nEpochs: 300, seed });
    umapAnim = EU.runner(u, { onFrame(a, f) { if (my !== gen) return; Eu = a.points(); pg.set(f); umapCard.plot.redraw(); }, onDone(a) { if (my !== gen) return; Eu = a.points(); const before = Eu.map((q) => q.slice()); Eu_te = a.transform(Xte, 100); const after = a.points(); /* read the fitted positions again after transform */ const moved = after.reduce((s, q, i) => s + (q[0] !== before[i][0] || q[1] !== before[i][1] ? 1 : 0), 0); R.set('ut', moved === 0 ? 'none (0 of 300)' : moved + ' of 300', moved === 0 ? '' : 'warn'); const accU = knnAcc(Eu, ytr, Eu_te, yte, 10); R.set('u', UI.pct(accU, 0), accU >= baseline - 0.05 ? 'good' : 'warn'); pg.set(1); umapCard.plot.redraw(); } });
  }
  function runTsne() {
    if (tsneAnim) tsneAnim.stop(); if (refitAnim) refitAnim.stop(); Etr_new = []; disp = null; R.set('tm', 'press the button'); bt.refit.disabled = true;
    const ts = new ML.TSNE(Xtr, { perplexity: 30, init: 'pca', seed });
    tsneAnim = EU.runner(ts, { onFrame(a) { Et = a.points(); tmap.plot.redraw(); }, onDone(a) { Et = a.points(); bt.refit.disabled = false; tmap.plot.redraw(); } });
  }
  function refit() {
    if (refitAnim) refitAnim.stop(); bt.refit.disabled = true; const joint = Xtr.concat(Xte), ts = new ML.TSNE(joint, { perplexity: 30, init: 'pca', seed });
    refitAnim = EU.runner(ts, { onFrame(a, f) { pg.set(f); }, onDone(a) {
      const E2 = a.points(), trNew = E2.slice(0, Xtr.length), teNew = E2.slice(Xtr.length), R2 = rigid(Et, trNew); // one rotation/reflection + shift, fitted on the training points
      const aligned = trNew.map((q) => R2(q)), testAligned = teNew.map((q) => R2(q));
      disp = { aligned, testAligned }; Etr_new = aligned;
      let diam = 0; const ex = (k) => Math.max(...Et.map((q) => q[k])) - Math.min(...Et.map((q) => q[k])); diam = Math.max(ex(0), ex(1));
      const mv = Et.map((q, i) => Math.hypot(q[0] - aligned[i][0], q[1] - aligned[i][1])).sort((x, y) => x - y), med = mv[Math.floor(mv.length / 2)];
      R.set('tm', UI.f(med, 1) + ' units (' + UI.pct(med / diam, 0) + ' of the map width)', med / diam > 0.05 ? 'warn' : ''); pg.set(1); bt.refit.disabled = false; tmap.plot.redraw();
    } });
  }
  /** returns a function applying the best rotation/reflection + translation taking B onto A (fitted on matched rows) */
  function rigid(A, B) {
    const ma = ML.colMeans(A), mb = ML.colMeans(B); let m11 = 0, m12 = 0, m21 = 0, m22 = 0;
    for (let i = 0; i < A.length; i++) { const ax = A[i][0] - ma[0], ay = A[i][1] - ma[1], bx = B[i][0] - mb[0], by = B[i][1] - mb[1]; m11 += bx * ax; m12 += bx * ay; m21 += by * ax; m22 += by * ay; }
    const M = [[m11, m12], [m21, m22]], MtM = [[m11 * m11 + m21 * m21, m11 * m12 + m21 * m22], [m12 * m11 + m22 * m21, m12 * m12 + m22 * m22]], e = ML.eigSym(MtM), V = e.vectors, s = e.values.map((v) => Math.sqrt(Math.max(v, 0)));
    const U = V.map((v, i) => { const u = [M[0][0] * v[0] + M[0][1] * v[1], M[1][0] * v[0] + M[1][1] * v[1]], k = s[i] > 1e-12 ? 1 / s[i] : 0; return [u[0] * k, u[1] * k]; });
    const Q = [[0, 0], [0, 0]]; for (let i = 0; i < 2; i++) for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) Q[a][b] += U[i][a] * V[i][b]; const Rm = [[Q[0][0], Q[1][0]], [Q[0][1], Q[1][1]]]; // M = B^T A = U S V^T, so B -> A needs V U^T = (U V^T)^T
    return (q) => { const x = q[0] - mb[0], y = q[1] - mb[1]; return [Rm[0][0] * x + Rm[0][1] * y + ma[0], Rm[1][0] * x + Rm[1][1] * y + ma[1]]; };
  }
  runUmap(); runTsne();
})();
