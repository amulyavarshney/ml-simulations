/* PCA inside a cross-validated pipeline on the wine data: honest vs leaky scaling, accuracy against k. */
(function () {
  'use strict';
  const { stage, side } = UI.shell('pca/pipeline-cv');
  const h = UI.h, wine = ML.data.wine(), X = wine.X, y = wine.y, n = X.length, d = 13, folds = ML.stratifiedFolds(y, 5);
  const globalScaler = ML.scaler(X, true), Xs = globalScaler.transform(X), globalPCA = ML.pca(Xs, { scale: false });
  const MODES = [{ id: 'honest', label: 'Honest pipeline', color: 0, shape: 'line', dash: null }, { id: 'leakyScaler', label: 'Leaky scaler (scaled on all rows)', color: 1, shape: 'dash', dash: [6, 5] }, { id: 'leakyAll', label: 'Leaky scaler + PCA (both fitted on all rows)', color: 2, shape: 'dash', dash: [2, 4] }];
  let res = {}, running = false, withLeaky = false, job = null, anim = null;

  function evalFold(k, te, mode) {
    const teSet = new Set(te), trI = []; for (let i = 0; i < n; i++) if (!teSet.has(i)) trI.push(i);
    const src = mode === 'honest' ? X : Xs; let pca, proj;
    if (mode === 'leakyAll') { pca = globalPCA; proj = (r) => pca.project(r, k); }
    else { pca = ML.pca(trI.map((i) => src[i]), { scale: mode === 'honest' }); proj = (r) => pca.project(r, k); }
    const Ztr = trI.map((i) => proj(src[i])), ytr = trI.map((i) => y[i]), lr = ML.softmax(Ztr, ytr, 3, { C: 1 });
    let ok = 0; for (const i of te) if (lr.predict(proj(src[i])) === y[i]) ok++; return ok / te.length;
  }
  function plan() { const modes = withLeaky ? MODES : [MODES[0]], list = []; for (const m of modes) for (let k = 1; k <= d; k++) if (!res[m.id] || !res[m.id][k]) list.push([m.id, k]); return list; }

  const c = UI.panel(side, 'Pipeline');
  UI.note(c, '<b>Scale → PCA(k) → logistic regression</b>, scored by 5-fold stratified cross-validation (the same folds as scikit-learn\'s default).');
  UI.check(c, { label: 'Also run the two leaky versions', value: false, onChange(v) { withLeaky = v; run(); } });
  UI.buttons(c, [{ id: 'run', label: 'Run the sweep', primary: true, onClick() { res = {}; run(); } }]);
  const pg = UI.progress(c);
  const rd = UI.panel(side, 'Readouts'), R = UI.read(rd, [{ id: 'best', label: 'Best k (highest mean accuracy)' }, { id: 'one', label: 'Smallest k within one spread (fold sd) of best', title: 'Smallest k whose mean accuracy is at least best mean minus the standard deviation of the best k\'s five fold accuracies (the bar length in the plot).' }, { id: 'se', label: 'Smallest k within one standard error of best', title: 'Stricter rule: the allowed gap is the fold sd divided by the square root of 5, the standard error of the mean over five folds. It can pick a larger k.' }, { id: 'all', label: 'All 13 components (no reduction)' }, { id: 'k1', label: 'Just k = 1' }, { id: 'gap', label: 'Leaky minus honest, at best k' }]);

  const P = UI.plotCard(stage, 'Cross-validated accuracy against the number of components', { xlim: [0.5, 13.5], ylim: [0.75, 1.0], aspect: 1.9, margin: { l: 54, b: 44, t: 38 }, hover: true, label: 'Cross-validated accuracy against k' }, 'Bars show ±1 standard deviation (the spread) across the five folds. Hover for values.');
  const lg = UI.legend(P.card, MODES.map((m) => ({ label: m.label, color: UI.colors().c[m.color], shape: m.shape })));
  const det = h('details', { class: 'card panel' }, h('summary', { text: 'Table view' })), tbody = h('tbody');
  det.append(h('table', { class: 't' }, h('thead', null, h('tr', null, h('th', { text: 'k' }), h('th', { text: 'honest mean ± sd' }), h('th', { text: 'leaky scaler' }), h('th', { text: 'leaky scaler + PCA' }))), tbody)); stage.append(det);

  function run() {
    if (anim) anim.stop(); job = plan(); const total = job.length, done0 = 0; if (!total) { refresh(); pg.set(1); return; } let i = 0;
    anim = UI.animate((ms) => { const t0 = performance.now(); while (i < job.length && performance.now() - t0 < ms) { const [m, k] = job[i++]; const accs = folds.map((te) => evalFold(k, te, m)); (res[m] = res[m] || {})[k] = { mean: ML.mean(accs), std: ML.std(accs), accs }; } pg.set(i / total); return i < job.length; }, refresh, { budget: 12 });
    anim.start();
  }
  function best(m) { const r = res[m]; if (!r) return null; let bk = null; for (let k = 1; k <= d; k++) if (r[k] && (bk === null || r[k].mean > r[bk].mean + 1e-12)) bk = k; return bk; }
  function refresh() {
    const r = res.honest || {}, bk = best('honest');
    const within = (gap) => { for (let k = 1; k <= d; k++) if (r[k] && r[k].mean >= r[bk].mean - gap) return k; return bk; };
    [lg.children[1], lg.children[2]].forEach((el) => { if (el) el.style.display = withLeaky ? '' : 'none'; }); /* leaky entries only while the box is ticked */
    if (bk) { const one = within(r[bk].std), se = within(r[bk].std / Math.sqrt(folds.length)); R.set('best', 'k = ' + bk + ' (' + UI.pct(r[bk].mean, 1) + ')'); R.set('one', 'k = ' + one + ' (' + UI.pct(r[one].mean, 1) + ')'); R.set('se', 'k = ' + se + ' (' + UI.pct(r[se].mean, 1) + ')'); R.set('all', r[13] ? UI.pct(r[13].mean, 1) : '–'); R.set('k1', r[1] ? UI.pct(r[1].mean, 1) : '–');
      const l = withLeaky && res.leakyScaler && res.leakyScaler[bk]; R.set('gap', l ? (100 * (l.mean - r[bk].mean) >= 0 ? '+' : '') + UI.f(100 * (l.mean - r[bk].mean), 2) + ' points' : 'tick “Also run the two leaky versions”'); }
    tbody.textContent = ''; for (let k = 1; k <= d; k++) { const a = r[k], b = withLeaky && res.leakyScaler && res.leakyScaler[k], cc = withLeaky && res.leakyAll && res.leakyAll[k]; tbody.append(h('tr', null, h('td', { text: k }), h('td', { text: a ? UI.pct(a.mean, 1) + ' ± ' + UI.f(100 * a.std, 1) : '–' }), h('td', { text: b ? UI.pct(b.mean, 1) : '–' }), h('td', { text: cc ? UI.pct(cc.mean, 1) : '–' }))); }
    P.plot.redraw();
  }
  P.plot.draw = (p, c) => {
    const col = p.col; p.axes({ xlabel: 'principal components kept, k', ylabel: 'accuracy', xticks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], yfmt: (v) => Math.round(v * 100) + '%' });
    MODES.forEach((m, mi) => { const r = res[m.id]; if (!r || (m.id !== 'honest' && !withLeaky)) return; const pts = []; for (let k = 1; k <= d; k++) if (r[k]) pts.push([k, r[k].mean]);
      if (m.id === 'honest') pts.forEach((q, i) => { const k = i + 1, s = r[k].std; p.seg(k, q[1] - s, k, Math.min(q[1] + s, 1), { color: col.c[0], w: 1.6, alpha: .45 }); });
      p.line(pts, { color: col.c[m.color], w: m.id === 'honest' ? 3 : 2.2, dash: m.dash }); pts.forEach((q) => p.dot(q[0], q[1], { fill: col.c[m.color], r: m.id === 'honest' ? 4.6 : 3.2, shape: ['circle', 'triangle', 'square'][mi] })); });
    const bk = best('honest'); if (bk) { p.ring(bk, res.honest[bk].mean, 11, { color: col.ink, w: 2 }); p.text(UI.clamp(p.X(bk), p.m.l + 34, p.W - 40), Math.max(p.Y(res.honest[bk].mean) - 22, 10), 'best k = ' + bk, { px: true, color: col.ink, weight: 700, align: 'center', halo: true }); }
    if (!res.honest) p.text(7, 0.87, 'Press “Run the sweep”', { align: 'center', color: col.muted, size: 14 });
  };
  P.plot.on('hover', (e) => { const k = Math.round(e.x); if (k < 1 || k > d || !res.honest || !res.honest[k]) return UI.tip.hide(); const a = res.honest[k]; let t = '<b>k = ' + k + '</b><br>honest ' + UI.pct(a.mean, 1) + ' ± ' + UI.f(100 * a.std, 1) + '<br>folds: ' + a.accs.map((v) => Math.round(v * 100)).join(', ') + '%'; MODES.slice(1).forEach((m) => { if (withLeaky && res[m.id] && res[m.id][k]) t += '<br>' + m.id + ' ' + UI.pct(res[m.id][k].mean, 1); }); UI.tip.show(t, e.cx, e.cy); });
  run();
})();
