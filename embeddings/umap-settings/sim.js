/* UMAP settings: n_neighbors, min_dist, the neighbour graph, the similarity curve. */
(function () {
  'use strict';
  const { stage, side } = UI.shell('embeddings/umap-settings');
  const h = UI.h;
  let ds = 'digits', nn = 15, md = 0.1, showGraph = false, seed = 2, gen = 0, anim = null, data = null, E = [], umap = null, ab = ML.umapAB(1, md), t0 = 0, ms = null;
  const sets = {
    digits: { label: 'Digits (400 images, 10 classes)', make() { const d = EU.digitsSubset(40, 8); return { X: d.X, y: d.y, kind: 'digit' }; } },
    roll: { label: 'Swiss roll (400 points)', make() { const s = ML.data.swissRoll(400, 0.2, ML.rng(4)), lo = Math.min(...s.t), hi = Math.max(...s.t); return { X: s.X.map((q) => Float64Array.from(q)), y: null, values: s.t.map((t) => (t - lo) / (hi - lo)), kind: 'grad' }; } },
    blobs: { label: 'Customers (3 segments, 10 features)', make() { const r = ML.rng(9), centers = [0, 1, 2].map(() => Array.from({ length: 10 }, () => 24 * r() - 12)), b = ML.data.blobs(centers, [120, 120, 120], [1.0, 1.0, 1.0], r); return { X: b.X.map((q) => Float64Array.from(q)), y: b.y, kind: 'dots' }; } },
  };
  data = sets[ds].make();

  const c = UI.panel(side, 'Data');
  UI.select(c, { label: 'Dataset', options: Object.keys(sets).map((k) => ({ value: k, label: sets[k].label })), value: ds, onChange(v) { ds = v; data = sets[ds].make(); run(); } });
  const s = UI.panel(side, 'UMAP settings');
  UI.slider(s, { label: 'n_neighbors', min: 2, max: 80, step: 1, value: nn, fmt: (v) => String(Math.round(v)), help: 'Size of the neighbourhood: small = local detail, large = broader picture.', onInput(v) { nn = Math.round(v); deb(); } });
  UI.slider(s, { label: 'min_dist', min: 0, max: 0.99, step: 0.01, value: md, fmt: (v) => v.toFixed(2), help: 'How tightly points may pack in the map.', onInput(v) { md = v; ab = ML.umapAB(1, md); curve.plot.redraw(); deb(); } });
  UI.check(s, { label: 'Show the neighbour graph', value: false, onChange(v) { showGraph = v; map.plot.redraw(); } });
  EU.speedControl(s);
  UI.buttons(s, [{ label: 'New seed', primary: true, onClick() { seed++; run(); } }]);
  const pg = UI.progress(s);
  const rd = UI.panel(side, 'Readouts'), R = UI.read(rd, [{ id: 'ab', label: 'Curve parameters a, b' }, { id: 'edges', label: 'Edges in the graph' }, { id: 'tw', label: 'Trustworthiness' }, { id: 'pu', label: 'Neighbour purity' }, { id: 'cross', label: 'Edges between different classes (share of edges · share of strength)' }, { id: 'time', label: 'Fit time' }]);

  const map = EU.mapCard(stage, 'UMAP map', '', { aspect: 1.45 });
  const curve = UI.plotCard(stage, 'Target similarity against distance in the map', { xlim: [0, 3], ylim: [0, 1.05], aspect: 2.6, margin: { l: 52, b: 40 }, label: 'Similarity curve 1 over 1 plus a d to the 2b' }, 'UMAP pulls points together where the graph says they are neighbours, and pushes random pairs apart, so that map distances follow this curve. min_dist is where it starts to fall.');
  const dl = EU.digitLegend(map.card); const upd = () => { dl.style.display = ds === 'digits' ? '' : 'none'; };
  map.plot.draw = (p) => {
    if (!E.length) return; const col = p.col, o = { kind: data.kind, labels: data.y, values: data.values, size: 11, r: 3.4 }; EU.fit(p, E);
    if (showGraph && umap) { const c2 = p.ctx; c2.save(); c2.beginPath(); c2.rect(p.m.l, p.m.t, p.pw, p.ph); c2.clip(); umap.edges.forEach((e) => { c2.globalAlpha = 0.08 + 0.45 * e[2]; c2.strokeStyle = col.ink2; c2.lineWidth = 0.8; c2.beginPath(); c2.moveTo(p.X(E[e[0]][0]), p.Y(E[e[0]][1])); c2.lineTo(p.X(E[e[1]][0]), p.Y(E[e[1]][1])); c2.stroke(); }); c2.restore(); }
    EU.drawMap(p, E, Object.assign(o, { alpha: showGraph ? 0.9 : 0.95 })); p.setLabel('UMAP map with n_neighbors ' + nn + ' and min_dist ' + md);
  };
  map.plot.on('hover', (e) => { if (!E.length || !data.y) return; let best = -1, bd = 9; E.forEach((t, i) => { const d = Math.hypot(map.plot.X(t[0]) - e.px, map.plot.Y(t[1]) - e.py); if (d < bd) { bd = d; best = i; } }); best < 0 ? UI.tip.hide() : UI.tip.show('class ' + data.y[best], e.cx, e.cy); });
  curve.plot.draw = (p) => {
    const col = p.col; p.axes({ xlabel: 'distance between two points in the map', ylabel: 'similarity', xticks: [0, 0.5, 1, 1.5, 2, 2.5, 3], yticks: [0, 0.25, 0.5, 0.75, 1] });
    const tgt = [], fit = []; for (let i = 0; i <= 150; i++) { const x = 3 * i / 150; tgt.push([x, x < md ? 1 : Math.exp(-(x - md))]); fit.push([x, 1 / (1 + ab.a * Math.pow(x, 2 * ab.b))]); }
    p.line(tgt, { color: col.c[1], w: 2, dash: [6, 5] }); p.line(fit, { color: col.c[0], w: 3 }); p.seg(md, 0, md, 1.05, { color: col.ink2, w: 1.2, dash: [2, 4] }); p.text(md, 0.08, 'min_dist = ' + md.toFixed(2), { color: col.ink2, dx: 6, weight: 600 });
    p.text(2.95, 0.55, 'fitted 1/(1 + a·dist^2b)', { color: col.c[0], align: 'right', weight: 700 }); p.text(2.95, 0.4, 'target (what it approximates)', { color: col.c[1], align: 'right', weight: 700 });
  };
  const deb = UI.debounce(() => run(), 250);
  function run() {
    gen++; const my = gen; if (anim) anim.stop(); upd(); ab = ML.umapAB(1, md); curve.plot.redraw(); t0 = performance.now(); ['tw', 'pu', 'cross'].forEach((k) => R.set(k, '…'));
    umap = new ML.UMAP(data.X, { nNeighbors: Math.min(nn, data.X.length - 1), minDist: md, nEpochs: 300, seed }); R.set('ab', UI.f(umap.a, 3) + ', ' + UI.f(umap.b, 3)); R.set('edges', umap.edges.length + ' (' + UI.f(2 * umap.edges.length / data.X.length, 1) + ' per point)');
    if (data.y) { let cr = 0, w = 0, wc = 0; umap.edges.forEach((e) => { w += e[2]; if (data.y[e[0]] !== data.y[e[1]]) { cr++; wc += e[2]; } }); R.set('cross', UI.pct(cr / umap.edges.length, 1) + ' (' + cr + ' of ' + umap.edges.length + ') · ' + UI.pct(wc / w, 1)); } else R.set('cross', 'n/a');
    anim = EU.runner(umap, { onFrame(a, f) { if (my !== gen) return; E = a.points(); pg.set(f); map.plot.redraw(); }, onDone(a) { if (my !== gen) return; E = a.points(); R.set('tw', UI.f(ML.trustworthiness(data.X, E, 10), 3)); R.set('pu', data.y ? UI.f(ML.neighbourPurity(E, data.y, 10), 3) : 'n/a'); R.set('time', ((performance.now() - t0) / 1000).toFixed(2) + ' s (incl. animation)'); pg.set(1); map.plot.redraw(); } });
  }
  run();
})();
