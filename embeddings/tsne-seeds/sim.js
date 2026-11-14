/* t-SNE seeds: three runs on the same digits; neighbourhoods agree, global arrangement does not. */
(function () {
  'use strict';
  const { stage, side } = UI.shell('embeddings/tsne-seeds');
  const h = UI.h;
  let perp = 30, init = 'random', align = false, digits = EU.digitsSubset(30, 21), maps = [[], [], []], done = [false, false, false], runs = [], gen = 0, tw = [null, null, null];
  const seeds = [1, 2, 3], cd = EU.centroidDists(digits.X, digits.y);

  UI.predict(side, { title: 'Poll 2 · predict first', q: 'You run t-SNE twice on the same digits with different random seeds. What will you see?', options: ['Identical pictures', 'Same neighbourhoods, different layout', 'Completely unrelated clusters', 'An error'], answer: 1,
    reveal: 'Same neighbourhoods, different layout. Local structure (who is near whom) is stable; the rotation, the positions of whole clusters and the gaps between them depend on the random start.' });
  const c = UI.panel(side, 'Settings');
  UI.slider(c, { label: 'Perplexity', min: 5, max: 60, step: 1, value: perp, fmt: (v) => String(Math.round(v)), onInput: UI.debounce((v) => { perp = Math.round(v); run(); }, 300) });
  UI.seg(c, { label: 'Initial positions', options: [{ value: 'random', label: 'Random' }, { value: 'pca', label: 'PCA' }], value: init, onChange(v) { init = v; run(); } });
  UI.check(c, { label: 'Align maps to run 1 (rotate / flip)', value: false, onChange(v) { align = v; redraw(); }, help: 'Orthogonal Procrustes alignment: removes rotation and reflection only.' });
  EU.speedControl(c);
  UI.buttons(c, [{ label: 'Run again', primary: true, onClick() { seeds.forEach((_, i) => { seeds[i] += 3; }); run(); } }]);
  const rd = UI.panel(side, 'Readouts'), R = UI.read(rd, [{ id: 'tw', label: 'Trustworthiness of runs 1, 2, 3' }, { id: 'ag', label: 'Agreement of between-cluster distances (mean r)' }, { id: 'ag12', label: 'Run 1 vs 2 / 1 vs 3 / 2 vs 3' }]);

  const row = h('div', { class: 'row' }); stage.append(row); row.style.gridTemplateColumns = 'repeat(auto-fit, minmax(230px, 1fr))';
  const cards = [0, 1, 2].map((i) => { const cd2 = EU.mapCard(row, 'Run ' + (i + 1) + (init === 'random' ? ' · seed ' + seeds[i] : ''), ''); cd2.card.querySelector('h3').id = 'rt' + i; return cd2; });
  EU.digitLegend(stage);
  cards.forEach((cc, i) => { cc.plot.draw = (p) => { const E = shown(i); if (E.length) EU.drawMap(p, E, { kind: 'digit', labels: digits.y, size: 10.5 }); p.setLabel('t-SNE run ' + (i + 1)); }; });
  function shown(i) { if (!align || i === 0 || !done[0] || !maps[i].length) return maps[i]; return ML.procrustes(maps[0], maps[i]); }
  function redraw() { cards.forEach((cc) => cc.plot.redraw()); }
  function stats() {
    if (!done.every(Boolean)) return;
    tw = maps.map((E) => ML.trustworthiness(digits.X, E, 10)); R.set('tw', tw.map((v) => UI.f(v, 3)).join(' · '));
    const d = maps.map((E) => EU.centroidDists(E, digits.y)), r12 = EU.corr(d[0], d[1]), r13 = EU.corr(d[0], d[2]), r23 = EU.corr(d[1], d[2]);
    R.set('ag', UI.f((r12 + r13 + r23) / 3, 2), (r12 + r13 + r23) / 3 > 0.9 ? 'good' : 'warn'); R.set('ag12', [r12, r13, r23].map((v) => UI.f(v, 2)).join(' / '));
  }
  function run() {
    gen++; const my = gen; runs.forEach((r) => r.stop()); runs = []; done = [false, false, false]; R.set('tw', '…'); R.set('ag', '…'); R.set('ag12', '…');
    cards.forEach((cc, i) => { cc.card.querySelector('h3').textContent = 'Run ' + (i + 1) + (init === 'random' ? ' · seed ' + seeds[i] : ' · PCA start'); maps[i] = []; });
    [0, 1, 2].forEach((i) => { const t = new ML.TSNE(digits.X, { perplexity: perp, init, seed: seeds[i] }); runs.push(EU.runner(t, { onFrame(a) { if (my !== gen) return; maps[i] = a.points(); cards[i].plot.redraw(); }, onDone(a) { if (my !== gen) return; maps[i] = a.points(); done[i] = true; stats(); redraw(); } })); });
  }
  run();
})();
