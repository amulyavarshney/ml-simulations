/* Misreading maps: cluster size vs true spread, and structure from nothing. */
(function () {
  'use strict';
  const { stage, side } = UI.shell('embeddings/misreading');
  const h = UI.h;
  let mode = 'sizes', seed = 3, gen = 0, runs = [], data = null, maps = {}, ready = {};
  const NAMES = ['Segment 1', 'Segment 2', 'Segment 3'], COUNTS = [240, 40, 40], STDS = [0.5, 2.0, 0.5];

  const pq = UI.predict(side, { title: 'Poll 3 · predict first', q: 'Three customer segments in 10 features: <b>Segment 1</b> has 240 customers and is tight, <b>Segment 2</b> has 40 and is loose (4× the spread), <b>Segment 3</b> has 40 and is tight. Which will look <b>widest</b> on a t-SNE map?', options: ['Segment 1', 'Segment 2', 'Segment 3', 'All look alike'], answer: 0,
    reveal: 'Segment 1, the biggest one. The maps give a crowd room in proportion to its head-count, and they even out density, so the truly loose Segment 2 is drawn about as tight as the others. Apparent size is not true spread.' });
  const c = UI.panel(side, 'Experiment');
  UI.seg(c, { label: 'Show', options: [{ value: 'sizes', label: 'Cluster sizes' }, { value: 'noise', label: 'Structure from nothing' }], value: mode, onChange(v) { mode = v; build(); } });
  EU.speedControl(c);
  UI.buttons(c, [{ label: 'New seed', primary: true, onClick() { seed++; build(); } }]);
  UI.note(c, 'Customer data: 320 customers, 10 features. Noise data: 300 points, 50 independent Gaussian features, so there are no clusters.');
  const pg = UI.progress(c);

  const body = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '14px' } }); stage.append(body);
  function clearBody() { runs.forEach((r) => r.stop()); runs = []; body.textContent = ''; }
  const tinyRow = (parent, min) => { const r = h('div', { class: 'row' }); r.style.gridTemplateColumns = 'repeat(auto-fit, minmax(' + (min || 230) + 'px, 1fr))'; parent.append(r); return r; };

  function build() {
    gen++; const my = gen; clearBody(); maps = {}; ready = {};
    pq.style.display = mode === 'sizes' ? '' : 'none';
    if (mode === 'sizes') buildSizes(my); else buildNoise(my);
  }
  function buildSizes(my) {
    const r = ML.rng(seed), centers = [0, 1, 2].map(() => Array.from({ length: 10 }, () => 24 * r() - 12));
    data = ML.data.blobs(centers, COUNTS, STDS, r); const X = data.X.map((q) => Float64Array.from(q)), y = data.y;
    const row = tinyRow(body, 280), cT = EU.mapCard(row, 't-SNE (perplexity 30)', ''), cU = EU.mapCard(row, 'UMAP (n_neighbors 15, min_dist 0.1)', '');
    const lg = UI.legend(body, NAMES.map((n, k) => ({ label: n + ' · ' + COUNTS[k] + ' customers', color: UI.cls(k).color, shape: UI.cls(k).shape })));
    const tab = h('section', { class: 'card panel' }, h('h3', { text: 'Apparent spread against true spread (each column relative to its own average)' })), tb1 = h('tbody'); tab.append(h('table', { class: 't' }, h('thead', null, h('tr', null, ['segment', 'customers', 'true spread (10-D)', 'in t-SNE map', 'in UMAP map'].map((t) => h('th', { text: t })))), tb1));
    const tab2 = h('section', { class: 'card panel' }, h('h3', { text: 'Distance between segment centres (relative to the average of the three)' })), tb2 = h('tbody'); tab2.append(h('table', { class: 't' }, h('thead', null, h('tr', null, ['pair', 'true distance (10-D)', 'in t-SNE map', 'in UMAP map'].map((t) => h('th', { text: t })))), tb2), h('p', { class: 'note', text: 'Spread = mean distance of a customer to its segment centre. Maps live in different units, so each column is divided by its own average over the three segments.' }));
    body.append(tab, tab2);
    const trueSp = EU.spreads(X, y), trueCd = EU.centroidDists(X, y), rel = (a) => { const m = ML.mean(a); return a.map((v) => v / m); };
    function fill() {
      tb1.textContent = ''; const st = maps.tsne && ready.tsne ? rel(EU.spreads(maps.tsne, y)) : null, su = maps.umap && ready.umap ? rel(EU.spreads(maps.umap, y)) : null, tr = rel(trueSp);
      NAMES.forEach((n, k) => tb1.append(h('tr', null, h('td', { text: n }), h('td', { text: COUNTS[k] }), h('td', { text: UI.f(tr[k], 2) + '×' }), h('td', { text: st ? UI.f(st[k], 2) + '×' : '…' }), h('td', { text: su ? UI.f(su[k], 2) + '×' : '…' }))));
      tb2.textContent = ''; const ct = ready.tsne ? rel(EU.centroidDists(maps.tsne, y)) : null, cu = ready.umap ? rel(EU.centroidDists(maps.umap, y)) : null, tc = rel(trueCd);
      ['1–2', '1–3', '2–3'].forEach((n, k) => tb2.append(h('tr', null, h('td', { text: 'Segments ' + n }), h('td', { text: UI.f(tc[k], 2) + '×' }), h('td', { text: ct ? UI.f(ct[k], 2) + '×' : '…' }), h('td', { text: cu ? UI.f(cu[k], 2) + '×' : '…' }))));
    }
    fill();
    [['tsne', cT, new ML.TSNE(X, { perplexity: 30, init: 'random', seed })], ['umap', cU, new ML.UMAP(X, { nNeighbors: 15, minDist: 0.1, seed })]].forEach(([key, card, alg]) => {
      card.plot.draw = (p) => { if (maps[key]) EU.drawMap(p, maps[key], { kind: 'dots', labels: y, r: 3.6 }); p.setLabel(key + ' map of customer segments'); };
      runs.push(EU.runner(alg, { onFrame(a, f) { if (my !== gen) return; maps[key] = a.points(); pg.set(f); card.plot.redraw(); }, onDone(a) { if (my !== gen) return; maps[key] = a.points(); ready[key] = true; fill(); card.plot.redraw(); } }));
    });
  }
  function buildNoise(my) {
    const r = ML.rng(seed + 50), X = Array.from({ length: 300 }, () => Float64Array.from({ length: 50 }, () => r.normal()));
    const row = tinyRow(body, 210), specs = [['t-SNE · perplexity 2', 'tsne', 2], ['t-SNE · perplexity 5', 'tsne', 5], ['t-SNE · perplexity 30', 'tsne', 30], ['t-SNE · perplexity 80', 'tsne', 80], ['UMAP · n_neighbors 5', 'umap', 5], ['UMAP · n_neighbors 50', 'umap', 50]];
    body.append(h('p', { class: 'note callout', html: 'There is <b>nothing here to find</b>: 300 points, 50 independent noise features. Any clump you see is made by the method.' }));
    const cards = specs.map((sp) => EU.mapCard(row, sp[0], '', { aspect: 1.05 })); let done = 0;
    cards.forEach((card, i) => { const [, kind, val] = specs[i]; const alg = kind === 'tsne' ? new ML.TSNE(X, { perplexity: val, init: 'random', seed }) : new ML.UMAP(X, { nNeighbors: val, minDist: 0.1, seed });
      card.plot.draw = (p) => { if (maps[i]) EU.drawMap(p, maps[i], { kind: 'dots', labels: null, r: 3 }); p.setLabel(specs[i][0] + ' of random noise'); };
      runs.push(EU.runner(alg, { onFrame(a, f) { if (my !== gen) return; maps[i] = a.points(); card.plot.redraw(); }, onDone(a) { if (my !== gen) return; maps[i] = a.points(); card.plot.redraw(); pg.set(++done / specs.length); } })); });
  }
  build();
})();
