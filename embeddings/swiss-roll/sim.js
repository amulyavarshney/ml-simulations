/* Swiss roll: rotatable 3-D view, PCA / t-SNE / UMAP maps coloured by position along the sheet, trustworthiness. */
(function () {
  'use strict';
  const { stage, side } = UI.shell('embeddings/swiss-roll');
  const h = UI.h;
  let n = 350, noise = 0.3, perp = 30, nn = 15, seed = 1, yaw = 0.55, pitch = 0.45, data, tn, runs = [], gen = 0;
  const trust = { pca: null, tsne: null, umap: null }; let maps = { pca: [], tsne: [], umap: [] }, progress = 0, pcaVar = 0;

  UI.predict(side, { q: 'PCA squeezes the Swiss roll into 2-D. What will the picture show?', options: ['A neat flat sheet, colours in smooth order', 'A flattened roll where the turns overlap', 'One separate cluster per colour', 'Random scatter'], answer: 1,
    reveal: 'The turns overlap. PCA projects every point with the same matrix, keeping the two directions of largest variance, so layers that are far apart along the sheet land on top of each other.' });
  const c = UI.panel(side, 'Data');
  const nS = UI.slider(c, { label: 'Points', min: 150, max: 600, step: 10, value: n, fmt: (v) => String(Math.round(v)), onInput: UI.debounce((v) => { n = Math.round(v); rerun(true); }, 250) });
  const zS = UI.slider(c, { label: 'Noise', min: 0, max: 2, step: 0.05, value: noise, fmt: (v) => v.toFixed(2), onInput: UI.debounce((v) => { noise = v; rerun(true); }, 250) });
  const m = UI.panel(side, 'Method settings');
  UI.slider(m, { label: 't-SNE perplexity', min: 5, max: 80, step: 1, value: perp, fmt: (v) => String(Math.round(v)), onInput: UI.debounce((v) => { perp = Math.round(v); rerun(false); }, 250) });
  UI.slider(m, { label: 'UMAP n_neighbors', min: 3, max: 60, step: 1, value: nn, fmt: (v) => String(Math.round(v)), onInput: UI.debounce((v) => { nn = Math.round(v); rerun(false); }, 250) });
  EU.speedControl(m);
  UI.buttons(m, [{ label: 'Re-run with a new seed', primary: true, onClick() { seed++; rerun(true); } }]);
  const v = UI.panel(side, '3-D view');
  UI.buttons(v, [{ label: 'Look along the roll\'s axis', onClick() { yaw = 0; pitch = Math.PI / 2; view.plot.redraw(); } }, { label: 'Side view', onClick() { yaw = 0; pitch = 0; view.plot.redraw(); } }, { label: 'Default view', onClick() { yaw = 0.55; pitch = 0.45; view.plot.redraw(); } }]);
  UI.note(v, 'Drag the roll to rotate it.');
  const rd = UI.panel(side, 'Trustworthiness (10 neighbours)'), R = UI.read(rd, [{ id: 'pca', label: 'PCA (2 components)' }, { id: 'tsne', label: 't-SNE' }, { id: 'umap', label: 'UMAP' }, { id: 'var', label: 'Variance PCA keeps' }]);
  UI.note(rd, 'The score is judged against the 3-D points you see, noise included. It catches false neighbours, not cuts.');
  const pr = UI.progress(rd);

  const view = UI.plotCard(stage, 'The Swiss roll in 3-D', { xlim: [-1.2, 1.2], ylim: [-1, 1], aspect: 2.2, equal: true, margin: { l: 6, r: 6, t: 6, b: 6 }, interactive: true, label: 'Rotatable three-dimensional Swiss roll coloured by position along the sheet' }, 'Colour = position along the sheet (light to dark). Drag to rotate.');
  const row = h('div', { class: 'row' }); stage.append(row); row.style.gridTemplateColumns = 'repeat(auto-fit, minmax(210px, 1fr))';
  const cards = { pca: EU.mapCard(row, 'PCA', ''), tsne: EU.mapCard(row, 't-SNE', ''), umap: EU.mapCard(row, 'UMAP', '') };
  Object.values(cards).forEach((cd) => { cd.cap = cd.card.appendChild(h('div', { class: 'cap', text: '' })); });

  view.plot.draw = (p, cx) => {
    const col = p.col, X = data.X, mean = ML.colMeans(X); let rmax = 0; X.forEach((q) => { rmax = Math.max(rmax, Math.hypot(q[0] - mean[0], q[1] - mean[1], q[2] - mean[2])); });
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), P = X.map((q, i) => { const x = (q[0] - mean[0]) / rmax, y = (q[1] - mean[1]) / rmax, z = (q[2] - mean[2]) / rmax; const x1 = x * cy + z * sy, z1 = -x * sy + z * cy, y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp; return [x1, y2, z2, i]; }).sort((a, b) => a[2] - b[2]);
    EU.frame(p); P.forEach((q) => { const r = 3.2 + 1.3 * (q[2] + 1) / 2; p.dot(q[0], q[1], { fill: EU.ramp(tn[q[3]]), r, lw: 0.8 }); });
    p.setLabel('Three-dimensional Swiss roll, ' + n + ' points, yaw ' + yaw.toFixed(1) + ' pitch ' + pitch.toFixed(1));
  };
  let last = null; view.plot.on('down', (e) => { last = [e.px, e.py]; view.plot.canvas.classList.add('grab'); return true; }).on('move', (e) => { yaw += (e.px - last[0]) * 0.012; pitch = UI.clamp(pitch + (e.py - last[1]) * 0.012, -Math.PI / 2, Math.PI / 2); last = [e.px, e.py]; view.plot.redraw(); }).on('up', () => view.plot.canvas.classList.remove('grab'));
  Object.keys(cards).forEach((k) => { cards[k].plot.draw = (p) => { if (maps[k].length) EU.drawMap(p, maps[k], { kind: 'grad', values: tn, r: 3.2 }); p.setLabel(k + ' map of the Swiss roll'); }; });

  function caption() {
    ['pca', 'tsne', 'umap'].forEach((k) => { cards[k].cap.innerHTML = trust[k] == null ? (k === 'pca' ? '' : 'running…') : 'trustworthiness <b>' + UI.f(trust[k], 3) + '</b>'; R.set(k, trust[k] == null ? '…' : UI.f(trust[k], 3)); });
  }
  function rerun(newData) {
    gen++; const my = gen; runs.forEach((r) => r.stop()); runs = []; trust.tsne = trust.umap = null; pr.set(0);
    if (newData || !data) { const sr = ML.data.swissRoll(n, noise, ML.rng(seed)); data = { X: sr.X.map((q) => Float64Array.from(q)), t: sr.t }; const lo = Math.min(...sr.t), hi = Math.max(...sr.t); tn = sr.t.map((t) => (t - lo) / (hi - lo)); }
    const pc = ML.pca(data.X); maps.pca = pc.transform(data.X, 2).map((q) => [q[0], q[1]]); pcaVar = pc.cum[1]; trust.pca = ML.trustworthiness(data.X, maps.pca, 10); R.set('var', UI.pct(pcaVar, 1));
    maps.tsne = []; maps.umap = []; caption(); Object.values(cards).forEach((cd) => cd.plot.redraw());
    const ts = new ML.TSNE(data.X, { perplexity: perp, init: 'pca', seed }), um = new ML.UMAP(data.X, { nNeighbors: nn, minDist: 0.1, nEpochs: 300, seed });
    let doneCount = 0; const fin = () => { if (my !== gen || ++doneCount < 2) return; trust.tsne = ML.trustworthiness(data.X, maps.tsne, 10); trust.umap = ML.trustworthiness(data.X, maps.umap, 10); caption(); };
    runs.push(EU.runner(ts, { onFrame(a, f) { if (my !== gen) return; maps.tsne = a.points(); progress = f; pr.set((f + um.epoch / um.nEpochs) / 2); cards.tsne.plot.redraw(); }, onDone: fin }));
    runs.push(EU.runner(um, { onFrame(a, f) { if (my !== gen) return; maps.umap = a.points(); cards.umap.plot.redraw(); }, onDone: fin }));
  }
  rerun(true);
})();
