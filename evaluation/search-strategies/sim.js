/* Grid, random and TPE search under a fixed budget, on a precomputed C x gamma surface of 5-fold CV accuracy for an RBF SVM. */
(function () {
  'use strict';
  const { stage, side } = UI.shell('evaluation/search-strategies');
  const h = UI.h, G = 15, CE = [-2, 3], GE = [-3, 2], NTR = 120, TMAX = 40, REPEATS = 100;
  const ce = (i) => CE[0] + (CE[1] - CE[0]) * i / (G - 1), ge = (j) => GE[0] + (GE[1] - GE[0]) * j / (G - 1), HALF = (CE[1] - CE[0]) / (G - 1) / 2;
  let kind = 'moons', noise = 0.3, dseed = 4, B = 9, sseed = 1, S = null, lo = 0, hi = 1, best = null, picks = null, job = null, rep = null, rjob = null;

  UI.predict(side, { title: 'Predict first', q: 'You may train only <b>9 models</b>. Option A: a <b>3 × 3 grid</b> of C and γ. Option B: <b>9 random (C, γ) pairs</b>. Which is more likely to land near the best <b>C</b>, and why?', options: ['The grid: it covers the space evenly', 'The random pairs: nine different values of C, the grid only three', 'Both the same', 'Neither: it is luck either way'], answer: 1,
    reveal: '<b>The random pairs.</b> A 3 \u00d7 3 grid tries only <b>three</b> different values of C (and three of \u03b3), however carefully they are spaced. Nine random pairs try about seven. Over 20 moons and 20 rings datasets, the grid tried a C within one step of the best C on 14 of 40, and nine random pairs did so about 90% of the time. But landing near the best C is not the same as scoring much higher: with two hyperparameters and a broad good region, the best scores of the three strategies were close. Press <i>Repeat 100 times</i> to see it on your data.' });
  const c = UI.panel(side, 'Task');
  UI.seg(c, { label: 'Data', options: [{ value: 'moons', label: 'Moons' }, { value: 'rings', label: 'Rings' }], value: kind, onChange(v) { kind = v; compute(); } });
  UI.slider(c, { label: 'Noise', min: 0.1, max: 0.5, step: 0.05, value: noise, fmt: (v) => v.toFixed(2), onInput: UI.debounce((v) => { noise = v; compute(); }, 250) });
  UI.buttons(c, [{ label: 'New data', onClick() { dseed++; compute(); } }]);
  UI.note(c, NTR + ' training points, an RBF SVM, 5-fold cross-validated accuracy for each of ' + G + ' × ' + G + ' = ' + G * G + ' (C, γ) pairs on log axes. Building the table takes a moment.');
  const pg = UI.progress(c);
  const sb = UI.panel(side, 'Search');
  UI.slider(sb, { label: 'Budget: models you may train', min: 4, max: TMAX, step: 1, value: B, fmt: (v) => String(Math.round(v)), onInput(v) { B = Math.round(v); search(); } });
  UI.buttons(sb, [{ label: 'Draw again', primary: true, onClick() { sseed++; search(); } }, { id: 'rep', label: 'Repeat 100 times', onClick() { repeat(); } }]);
  UI.note(sb, 'Grid: evenly spaced pairs. Random: seeded, so “Draw again” changes the seed. TPE: <b>a compact TPE like Optuna\'s default sampler, not the Optuna package</b>: the first 5 trials are random; after that it splits the trials so far into the best quarter and the rest, fits a smoothed density to each, and proposes the point where “good” is most likely relative to “bad”. Each pair is looked up in the table (it snaps to the nearest cell).');
  const pg2 = UI.progress(sb);

  const row = h('div', { class: 'row' }); stage.append(row); row.style.gridTemplateColumns = 'repeat(auto-fit, minmax(260px, 1fr))'; row.style.alignItems = 'start';
  const ST = [{ id: 'grid', title: 'Grid', shape: 'square' }, { id: 'rnd', title: 'Random', shape: 'circle' }, { id: 'tpe', title: 'TPE (compact)', shape: 'triangle' }];
  const M = {}; ST.forEach((s) => { M[s.id] = UI.plotCard(row, s.title, { xlim: [GE[0] - HALF, GE[1] + HALF], ylim: [CE[0] - HALF, CE[1] + HALF], aspect: 1.0, margin: { l: 44, r: 8, t: 8, b: 36 }, hover: true, label: s.title + ' search: the (C, gamma) pairs it tried on the accuracy map' }, ' '); });
  UI.legend(M.tpe.card, [{ label: 'a pair that was tried', color: UI.colors().c[1], shape: 'circle' }, { label: 'ring: best of those', color: UI.colors().ink, shape: 'circle' }, { label: 'green diamond: best cell on the whole map', color: UI.colors().c[2], shape: 'diamond' }]);
  const lo1 = h('span', { class: 'mono' }), hi1 = h('span', { class: 'mono' }), bar1 = h('span', { style: { flex: '0 1 220px', height: '12px', borderRadius: '3px', border: '1px solid var(--line)' }, 'aria-hidden': 'true' });
  stage.append(h('div', { class: 'note', style: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', margin: '-4px 6px 0' } }, 'Colour = 5-fold accuracy of each cell, same scale in all three maps:', lo1, bar1, hi1));
  const paintBar = () => { bar1.style.background = 'linear-gradient(to right, ' + [0, 0.25, 0.5, 0.75, 1].map(EVU.ramp).join(', ') + ')'; if (S) { lo1.textContent = EVU.pc(lo, 0); hi1.textContent = EVU.pc(hi, 0); } };
  window.addEventListener('themechange', () => { paintBar(); }); paintBar();
  const T = EVU.card(stage, 'What each strategy found with this budget'); const tab = EVU.table(T, ['Strategy', 'Models', 'Best found', 'C values tried', 'γ values tried', 'Nearest C to the best'], [['', '', '', '', '', ''], ['', '', '', '', '', ''], ['', '', '', '', '', '']], { caption: 'Results of each search strategy' });
  const tnote = UI.note(T, '', 'callout');
  const Cu = UI.plotCard(stage, 'Average best score against budget (100 repeats)', { xlim: [1, TMAX], ylim: [0.8, 1], aspect: 2.1, margin: { l: 54, r: 14, t: 12, b: 42 }, hover: true, label: 'Average best accuracy found against the number of models trained, for grid, random and TPE search' }, 'Press “Repeat 100 times”. Each line is the average, over 100 seeded runs, of the best accuracy found so far; shading covers the middle 80% of runs. The grid has no randomness, so it is one line: lucky or unlucky about where its lines fall.');
  UI.legend(Cu.card, [{ label: 'grid', color: UI.colors().c[2], shape: 'square' }, { label: 'random', color: UI.colors().c[0], shape: 'circle' }, { label: 'TPE (compact)', color: UI.colors().c[1], shape: 'triangle' }, { label: 'best cell on the map', color: UI.colors().muted, shape: 'dash' }]);
  const cnote = UI.note(Cu.card, '', 'callout');

  const pw = (v) => String(+Math.pow(10, v).toPrecision(2));
  const cellOf = (u) => Math.min(G - 1, Math.max(0, Math.round(u * (G - 1))));
  function gridPts(b) { const g = Math.floor(Math.sqrt(b)), a = g; let bb = g; if (a * (bb + 1) <= b) bb++; const pos = (m, q) => Math.round(((q + 0.5) / m) * G - 0.5), pts = []; for (let i = 0; i < a; i++) for (let j = 0; j < bb; j++) pts.push([pos(a, i), pos(bb, j)]); return pts; }
  function randomRun(rng, T2) { const p = []; for (let t = 0; t < T2; t++) p.push([cellOf(rng()), cellOf(rng())]); return p; }
  function tpeRun(rng, T2) { const hist = [], p = []; for (let t = 0; t < T2; t++) { const x = ML.tpeSuggest(hist, 2, rng, { startup: 5 }), cell = [cellOf(x[0]), cellOf(x[1])]; hist.push({ x, score: S[cell[0]][cell[1]] }); p.push(cell); } return p; }
  const sc = (p) => S[p[0]][p[1]];
  function summary(pts) { const sc2 = pts.map(sc), bi = sc2.indexOf(Math.max(...sc2)); return { pts, best: Math.max(...sc2), bestPt: pts[bi], nC: new Set(pts.map((q) => q[0])).size, nG: new Set(pts.map((q) => q[1])).size, near: Math.min(...pts.map((q) => Math.abs(q[0] - best[0]))) }; }

  function* build(my, k, nz, ds) {
    const r = ML.rng(ds * 7 + 1), d = k === 'moons' ? ML.data.moons(NTR, nz, r) : ML.data.circles(NTR, nz * 0.55, 0.45, r), X = d.X, y = d.y.map((v) => (v ? 1 : -1)), sp = ML.stratKFold(y, 5, ML.rng(ds + 3)), out = [];
    for (let i = 0; i < G; i++) {
      const rowv = []; for (let j = 0; j < G; j++) { let acc = 0; for (const s of sp) { const m = ML.svc(s.train.map((q) => X[q]), s.train.map((q) => y[q]), { kernel: 'rbf', gamma: Math.pow(10, ge(j)), C: Math.pow(10, ce(i)), maxMs: 150 }); let ok = 0; for (const q of s.test) if (m.predict(X[q]) === y[q]) ok++; acc += ok / s.test.length / sp.length; } rowv.push(acc); }
      out.push(rowv); yield (i + 1) / G;
    }
    if (my === buildId) { S = out; finishTable(); }
  }
  let buildId = 0;
  function compute() { if (job) job.stop(); if (rjob) rjob.stop(); S = null; rep = null; picks = null; buildId++; job = EVU.job(build(buildId, kind, noise, dseed), { progress: pg, frame: () => redraw() }); redraw(); }
  function finishTable() {
    const flat = S.flat(); lo = Math.min(...flat); hi = Math.max(...flat); let bi = [0, 0]; S.forEach((rw, i) => rw.forEach((v, j) => { if (v > S[bi[0]][bi[1]] + 1e-12) bi = [i, j]; })); best = bi; paintBar(); search();
  }
  function search() {
    if (!S) return; const gp = gridPts(B), rp = randomRun(ML.rng(sseed * 131 + 1), B), tp = tpeRun(ML.rng(sseed * 977 + 5), B);
    picks = { grid: summary(gp), rnd: summary(rp), tpe: summary(tp) }; redraw();
  }
  function redraw() {
    ST.forEach((s) => M[s.id].plot.redraw()); Cu.plot.redraw();
    if (!S || !picks) { tab.set(ST.map((s) => [s.title, '…', '…', '…', '…', '…'])); tnote.innerHTML = 'Building the accuracy table…'; return; }
    ST.forEach((s) => { M[s.id].card.querySelector('h3').textContent = s.title + ' \u00b7 best ' + EVU.pc(picks[s.id].best, 1); });
    tab.set(ST.map((s) => { const q = picks[s.id]; return [s.title, String(q.pts.length), { text: EVU.pc(q.best, 1), cls: q.best >= S[best[0]][best[1]] - 1e-9 ? 'good' : '' }, String(q.nC), String(q.nG), q.near === 0 ? '0 steps (hit)' : q.near + (q.near === 1 ? ' step' : ' steps')]; }));
    tnote.innerHTML = 'The best cell on the whole map scores <b>' + EVU.pc(S[best[0]][best[1]], 1) + '</b> (C ≈ ' + UI.sci(Math.pow(10, ce(best[0]))) + ', γ ≈ ' + UI.sci(Math.pow(10, ge(best[1]))) + '). One step on a log axis is a factor of 2.3. A search only sees the cells it evaluates.';
  }
  ST.forEach((s) => {
    const P = M[s.id].plot;
    P.draw = (p) => {
      const col = p.col; if (!S) { p.axes({ xlabel: 'γ', ylabel: 'C' }); p.text(0, 0.5, 'Building the table…', { align: 'center', color: col.muted, size: 14 }); return; }
      p.axes({ grid: false, xticks: [-3, -2, -1, 0, 1, 2], yticks: [-2, -1, 0, 1, 2, 3], xfmt: pw, yfmt: pw, xlabel: 'γ (log scale)', ylabel: 'C (log scale)' });
      for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) p.rect(ge(j) - HALF, ce(i) - HALF, ge(j) + HALF, ce(i) + HALF, { fill: EVU.ramp((S[i][j] - lo) / Math.max(1e-9, hi - lo)), alpha: 1, stroke: col.surface, w: 0.6 });
      p.dot(ge(best[1]), ce(best[0]), { fill: col.c[2], shape: 'diamond', r: 7, lw: 1.6, stroke: col.ink });
      if (!picks) return; const q = picks[s.id];
      q.pts.forEach((pt) => p.dot(ge(pt[1]), ce(pt[0]), { fill: col.c[1], shape: s.shape, r: 5, lw: 1.6, stroke: col.ink }));
      p.ring(ge(q.bestPt[1]), ce(q.bestPt[0]), 10, { color: col.ink, w: 2.4 });
      p.setLabel(s.title + ' search tried ' + q.pts.length + ' pairs, ' + q.nC + ' different C values and ' + q.nG + ' different gamma values; best accuracy found ' + EVU.pc(q.best, 1));
    };
    P.on('hover', (e) => { if (!S) return; const j = Math.round((e.x - GE[0]) / (GE[1] - GE[0]) * (G - 1)), i = Math.round((e.y - CE[0]) / (CE[1] - CE[0]) * (G - 1)); if (i < 0 || j < 0 || i >= G || j >= G) return UI.tip.hide(); UI.tip.show('C = ' + UI.sci(Math.pow(10, ce(i))) + '<br>γ = ' + UI.sci(Math.pow(10, ge(j))) + '<br>5-fold accuracy ' + EVU.pc(S[i][j], 1), e.cx, e.cy); });
  });

  /* ---- 100 repeats ---- */
  function repeat() {
    if (!S) return; if (rjob) rjob.stop(); const R = [], Tt = [], hit = { rnd: new Float64Array(TMAX), tpe: new Float64Array(TMAX) }, dc = { rnd: new Float64Array(TMAX), tpe: new Float64Array(TMAX) };
    function* g() {
      for (let r = 0; r < REPEATS; r++) {
        [['rnd', randomRun(ML.rng(r * 17 + 3 + sseed * 1000), TMAX)], ['tpe', tpeRun(ML.rng(r * 23 + 5 + sseed * 1000), TMAX)]].forEach(([id, pts]) => {
          let b = 0; const row = [], seenC = new Set(); let near = 99;
          pts.forEach((q, t) => { b = Math.max(b, sc(q)); row.push(b); seenC.add(q[0]); near = Math.min(near, Math.abs(q[0] - best[0])); dc[id][t] += seenC.size / REPEATS; if (near <= 1) hit[id][t] += 1 / REPEATS; });
          (id === 'rnd' ? R : Tt).push(row);
        }); yield (r + 1) / REPEATS;
      }
      const stat = (M2) => Array.from({ length: TMAX }, (_, t) => { const v = M2.map((q) => q[t]); return { mean: ML.mean(v), lo: ML.quantile(v, 0.1), hi: ML.quantile(v, 0.9) }; });
      rep = { rnd: stat(R), tpe: stat(Tt), grid: Array.from({ length: TMAX }, (_, t) => Math.max(...gridPts(t + 1).map(sc))), hit, dc, nC: Array.from({ length: TMAX }, (_, t) => new Set(gridPts(t + 1).map((q) => q[0])).size) };
      repNote(); Cu.plot.redraw();
    }
    rjob = EVU.job(g(), { progress: pg2, frame: () => {} });
  }
  function repNote() {
    if (!rep) { cnote.innerHTML = ''; return; } const t = B - 1, f = (v) => EVU.pc(v, 1);
    cnote.innerHTML = 'At a budget of <b>' + B + '</b>: grid best <b>' + f(rep.grid[t]) + '</b> (' + rep.nC[t] + ' different C values), random average best <b>' + f(rep.rnd[t].mean) + '</b> (about ' + rep.dc.rnd[t].toFixed(1) + ' different C values), TPE average best <b>' + f(rep.tpe[t].mean) + '</b>. Chance of trying a C within one step of the best C: random <b>' + f(rep.hit.rnd[t]) + '</b>, TPE <b>' + f(rep.hit.tpe[t]) + '</b>.';
  }
  Cu.plot.draw = (p) => {
    const col = p.col; p.axes({ xlabel: 'models trained (budget)', ylabel: 'best accuracy found', xticks: [1, 5, 10, 15, 20, 25, 30, 35, 40], yfmt: (v) => Math.round(v * 100) + '%' });
    if (S) p.seg(1, S[best[0]][best[1]], TMAX, S[best[0]][best[1]], { color: col.muted, w: 1.6, dash: [5, 5] });
    if (!rep) { p.text(20, 0.9, 'Press “Repeat 100 times”', { align: 'center', color: col.muted, size: 14 }); return; }
    const lim = (a) => a.map((q, i) => [i + 1, q]);
    [['rnd', col.c[0]], ['tpe', col.c[1]]].forEach(([id, c2]) => { const a = rep[id]; p.poly(a.map((q, i) => [i + 1, q.hi]).concat(a.map((q, i) => [i + 1, q.lo]).reverse()), { fill: c2, alpha: 0.12 }); p.line(a.map((q, i) => [i + 1, q.mean]), { color: c2, w: 2.8, dash: id === 'tpe' ? [8, 5] : null }); });
    p.line(lim(rep.grid), { color: col.c[2], w: 2.4 }); rep.grid.forEach((v, i) => { if (i % 3 === 0) p.dot(i + 1, v, { fill: col.c[2], shape: 'square', r: 3.6, lw: 1 }); });
    p.seg(B, 0.8, B, 1, { color: col.accent, w: 1.4, dash: [3, 3] }); p.setLabel('Average best accuracy against budget for grid, random and TPE search');
  };
  Cu.plot.on('hover', (e) => { if (!rep) return; const t = Math.round(e.x) - 1; if (t < 0 || t >= TMAX) return UI.tip.hide(); UI.tip.show('<b>Budget ' + (t + 1) + '</b><br>grid ' + EVU.pc(rep.grid[t], 1) + '<br>random ' + EVU.pc(rep.rnd[t].mean, 1) + '<br>TPE ' + EVU.pc(rep.tpe[t].mean, 1), e.cx, e.cy); });
  const sb2 = sb.querySelector('input[type=range]'); if (sb2) sb2.addEventListener('input', () => { repNote(); Cu.plot.redraw(); });
  compute();
})();
