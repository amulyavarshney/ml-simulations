/* t-SNE perplexity: per-point Gaussian neighbourhoods on a 2-D set, and t-SNE of the digits at the chosen perplexity. */
(function () {
  'use strict';
  const { stage, side } = UI.shell('embeddings/tsne-perplexity');
  const h = UI.h;
  let perp = 30, selected = 0, runSeed = 5, anim = null, gen = 0, E = [], digits = EU.digitsSubset(30, 5), history = [], progress = 0;
  /* a 2-D set with three densities */
  const rg = ML.rng(11), blob = (cx, cy, s, m) => Array.from({ length: m }, () => [cx + s * rg.normal(), cy + s * rg.normal()]);
  const P2 = blob(-3.2, 0.2, 0.3, 60).concat(blob(0.8, 1.2, 0.7, 45), blob(3.6, -1.6, 1.2, 35)), N2 = P2.length, D2 = ML.sqDistMatrix(P2);
  let row = null;

  UI.predict(side, { title: 'Quiz Q1 · predict first', q: 'Which change helps when t-SNE splits <b>one real cluster</b> into several fragments?', options: ['Lower the perplexity', 'Raise the perplexity', 'Run fewer iterations', 'Remove early exaggeration'], answer: 1,
    reveal: 'Raise the perplexity. A larger perplexity widens every point\'s neighbourhood, so fragments of one cluster see each other and rejoin. Too large a value begins to merge different clusters.' });
  const c = UI.panel(side, 'Perplexity');
  const pS = UI.slider(c, { label: 'Perplexity', min: 2, max: 80, step: 1, value: perp, fmt: (v) => String(Math.round(v)), onInput(v) { perp = Math.round(v); neighbourhood(); debouncedRun(); } });
  UI.buttons(c, [{ label: 'Run t-SNE again', primary: true, onClick() { runSeed++; run(); } }, { label: 'Clear table', onClick() { history = []; table(); } }]);
  EU.speedControl(c);
  UI.note(c, 'Digits: 300 images, 30 per class, 64 pixel features. The slider drives both pictures.');
  const rd = UI.panel(side, 'Selected point (left)'), R = UI.read(rd, [{ id: 'sig', label: 'Gaussian width σ' }, { id: 'pp', label: 'Perplexity achieved' }, { id: 'nb', label: 'Points with ≥ 10% of the top weight' }]);
  const rr = UI.panel(side, 'This run (right)'), R2 = UI.read(rr, [{ id: 'kl', label: 'KL divergence' }, { id: 'tw', label: 'Trustworthiness' }, { id: 'pu', label: 'Neighbour purity' }]);
  const pr = UI.progress(rr);

  const A = UI.plotCard(stage, 'A point\'s neighbourhood on a 2-D dataset', { xlim: [-5, 6], ylim: [-4, 3.6], aspect: 1.6, equal: true, interactive: true, margin: { l: 8, r: 8, t: 8, b: 8 }, label: 'Scatter of three blobs with different density; the selected point has a Gaussian neighbourhood' }, 'Click a point. Marker size shows its weight in the selected point\'s neighbourhood; rings mark σ and 2σ.');
  const B = UI.plotCard(stage, 't-SNE map of the digits', { aspect: 1.5, equal: true, margin: { l: 6, r: 6, t: 6, b: 6 }, hover: true, label: 't-SNE map of 300 handwritten digits' }, '');
  EU.digitLegend(B.card);
  const det = h('section', { class: 'card panel' }, h('h3', { text: 'Runs so far' })), tb = h('tbody'); det.append(h('table', { class: 't' }, h('thead', null, h('tr', null, ['perplexity', 'KL divergence', 'trustworthiness', 'neighbour purity'].map((t) => h('th', { text: t })))), tb), h('p', { class: 'note', html: 'KL moves with perplexity, so it cannot rank settings. Trustworthiness is a fairer yardstick.' })); stage.append(det);

  function neighbourhood() {
    row = ML.tsneRow(D2, N2, selected, Math.min(perp, (N2 - 1) / 3)); const mx = Math.max(...row.w), cnt = Array.from(row.w).filter((v) => v >= 0.1 * mx).length;
    R.set('sig', UI.f(row.sigma, 2)); R.set('pp', UI.f(row.perplexity, 1) + ' (target ' + Math.min(perp, Math.round((N2 - 1) / 3)) + ')'); R.set('nb', String(cnt)); A.plot.redraw();
  }
  A.plot.draw = (p, c) => {
    const col = p.col; EU.frame(p); const q = P2[selected], mx = Math.max(...row.w);
    p.ring(q[0], q[1], row.sigma * p.pw / (p.vx[1] - p.vx[0]), { color: col.c[1], w: 2 }); p.ring(q[0], q[1], 2 * row.sigma * p.pw / (p.vx[1] - p.vx[0]), { color: col.c[1], w: 1.4, dash: [5, 4] });
    P2.forEach((t, i) => { const wgt = row.w[i] / mx; p.dot(t[0], t[1], { fill: col.c[0], r: 2.2 + 6.5 * Math.sqrt(wgt), alpha: i === selected ? 1 : 0.35 + 0.65 * wgt, lw: 0.6 }); });
    p.dot(q[0], q[1], { fill: col.c[1], r: 6.5, shape: 'star', lw: 1.5 });
    p.text(q[0], q[1] - row.sigma - 0.35, 'σ = ' + UI.f(row.sigma, 2), { color: col.c[1], weight: 700, align: 'center', halo: true, size: 12 });
  };
  A.plot.on('down', (e) => { let best = -1, bd = 18; P2.forEach((t, i) => { const d = Math.hypot(A.plot.X(t[0]) - e.px, A.plot.Y(t[1]) - e.py); if (d < bd) { bd = d; best = i; } }); if (best >= 0) { selected = best; neighbourhood(); } return false; });
  B.plot.draw = (p) => { if (E.length) EU.drawMap(p, E, { kind: 'digit', labels: digits.y, size: 11 }); p.setLabel('t-SNE map of digits at perplexity ' + perp); };
  B.plot.on('hover', (e) => { if (!E.length) return; let best = -1, bd = 9; E.forEach((t, i) => { const d = Math.hypot(B.plot.X(t[0]) - e.px, B.plot.Y(t[1]) - e.py); if (d < bd) { bd = d; best = i; } }); best < 0 ? UI.tip.hide() : UI.tip.show('digit ' + digits.y[best], e.cx, e.cy); });
  function table() { tb.textContent = ''; history.slice().sort((a, b) => a.perp - b.perp).forEach((r) => tb.append(h('tr', null, h('td', { text: r.perp }), h('td', { text: UI.f(r.kl, 3) }), h('td', { text: UI.f(r.tw, 4) }), h('td', { text: UI.f(r.pu, 3) })))); if (!history.length) tb.append(h('tr', null, h('td', { colSpan: 4, text: 'Run t-SNE at several perplexities to fill this table.' }))); }
  function run() {
    gen++; const my = gen; if (anim) anim.stop(); const t = new ML.TSNE(digits.X, { perplexity: perp, init: 'pca', seed: runSeed }); R2.set('kl', '…'); R2.set('tw', '…'); R2.set('pu', '…');
    anim = EU.runner(t, { onFrame(a, f) { if (my !== gen) return; E = a.points(); pr.set(f); B.plot.redraw(); }, onDone(a) { if (my !== gen) return; E = a.points(); const kl = a.klDivergence(), tw = ML.trustworthiness(digits.X, E, 10), pu = ML.neighbourPurity(E, digits.y, 10); R2.set('kl', UI.f(kl, 3)); R2.set('tw', UI.f(tw, 4)); R2.set('pu', UI.f(pu, 3)); history = history.filter((r) => r.perp !== perp).concat({ perp, kl, tw, pu }); table(); pr.set(1); B.plot.redraw(); } });
  }
  const debouncedRun = UI.debounce(run, 300);
  neighbourhood(); table(); run();
})();
