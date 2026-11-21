/* Is 86% really better than 85%? Two models scored on independent test sets: how much the gap moves by chance alone, and a bootstrap interval for one test set. */
(function () {
  'use strict';
  const { stage, side } = UI.shell('decisions/test-set-noise');
  const h = UI.h, NCMP = 1000, NBOOT = 2000;
  let a1 = 0.85, a2 = 0.86, n = 1000, seed = 1, res = null, job = null, gen = 0, boot = null, bjob = null, bgen = 0, pendingReveal = false, bseed = 1, info1 = null;

  const box = UI.predict(side, { title: 'Predict first', q: 'Two models are <b>equally good</b> (85% accurate each). Each is scored on its <b>own 1,000 test rows</b>. How big a gap between the two scores will chance alone produce about <b>1 time in 20</b>?', options: ['0.3 points', '1 point', '3 points', '10 points'], answer: 2,
    reveal: 'Press a button to see the answer.',
    onReveal() { a1 = 0.85; a2 = 0.85; n = 1000; s1.set(a1); s2.set(a2); sn.set(n); box.querySelector('.reveal').innerHTML = 'Setting both models to 85% and 1,000 rows and running 1,000 comparisons…'; pendingReveal = true; run(); } });
  function revealText() {
    const sd = Math.sqrt(2 * 0.85 * 0.15 / 1000) * 100, g = res.gaps, q = [ML.quantile(g, 0.025), ML.quantile(g, 0.975)], out = g.filter((v) => Math.abs(v) >= 1.96 * sd).length / g.length;
    return '<b>About 3 points.</b> Each score has a standard error of √(0.85 × 0.15 / 1000) = 1.13 points, so the gap between two independent scores has √2 times that, <b>' + UI.f(sd, 2) + '</b> points, and about 1 time in 20 it is more than 1.96 times that: <b>' + UI.f(1.96 * sd, 1) + ' points</b>. In the simulation the middle 95% of the 1,000 gaps ran from <b>' + UI.f(q[0], 1) + '</b> to <b>+' + UI.f(q[1], 1) + '</b> points, and <b>' + DU.pct(out, 1) + '</b> of them were at least ' + UI.f(1.96 * sd, 1) + ' points away from zero.';
  }

  const c = UI.panel(side, 'Two models and a test set');
  const s1 = UI.slider(c, { label: 'True accuracy of model A', min: 0.5, max: 0.99, step: 0.005, value: a1, fmt: (v) => (100 * v).toFixed(1) + '%', onInput: UI.debounce((v) => { a1 = v; run(); }, 250) });
  const s2 = UI.slider(c, { label: 'True accuracy of model B', min: 0.5, max: 0.99, step: 0.005, value: a2, fmt: (v) => (100 * v).toFixed(1) + '%', help: 'The accuracy each model would get on all the data there could ever be.', onInput: UI.debounce((v) => { a2 = v; run(); }, 250) });
  const sn = UI.slider(c, { label: 'Rows in each test set', min: 100, max: 20000, log: true, step: 0.04, value: n, fmt: (v) => DU.n(nice(v)), onInput: UI.debounce((v) => { n = nice(v); run(); }, 250) });
  UI.buttons(c, [{ label: 'New seed', primary: true, onClick() { seed++; run(); } }]);
  const pg = UI.progress(c);
  UI.note(c, 'Every comparison draws two fresh test sets, one for each model: the number of right answers is a random binomial draw with the true accuracy. Seeded, so the same settings give the same picture.');
  const rd = UI.panel(side, NCMP.toLocaleString('en-US') + ' comparisons');
  const R = UI.read(rd, [{ id: 'true', label: 'True gap, B minus A' }, { id: 'sd', label: 'Spread of the observed gap (sd)' }, { id: 'band', label: 'Middle 95% of the gap' }, { id: 'theory', label: 'Theory: true gap ± 1.96 sd' }, { id: 'worse', label: 'Truly worse model scores higher' }, { id: 'tie', label: 'Exact tie' }]);
  const one = UI.panel(side, 'One test set');
  UI.buttons(one, [{ id: 'one', label: 'Draw one test set for each model', primary: true, onClick() { bseed++; draw1(); } }]);
  const pg2 = UI.progress(one);
  const R1 = UI.read(one, [{ id: 'a', label: 'Score of A' }, { id: 'b', label: 'Score of B' }, { id: 'gap', label: 'Observed gap, B minus A' }, { id: 'ci', label: '95% bootstrap interval' }, { id: 'zero', label: 'Interval includes zero?' }]);

  const H = UI.plotCard(stage, 'The gap between the two test scores, in 1,000 comparisons', { xlim: [-8, 8], ylim: [0, 100], aspectFn: DU.asp(2.0, 1.4), margin: { l: 52, r: 14, t: 12, b: 44 }, hover: true, label: 'Histogram of the observed gap' }, ' ');
  UI.legend(H.card, [{ label: 'observed gaps', color: UI.colors().c[0], shape: 'square' }, { label: 'true gap', color: UI.colors().c[2], shape: 'line' }, { label: 'zero: no difference', color: UI.colors().ink, shape: 'line' }, { label: 'what theory predicts', color: UI.colors().c[1], shape: 'dash' }]);
  const hnote = UI.note(H.card, 'Running…', 'callout');
  const B = UI.plotCard(stage, 'One test set: how sure can you be? Bootstrap interval of the gap', { xlim: [-8, 8], ylim: [0, 100], aspectFn: DU.asp(2.4, 1.4), margin: { l: 52, r: 14, t: 12, b: 44 }, hover: true, label: 'Bootstrap distribution of the gap for one test set' }, 'The bootstrap redraws each test set ' + DU.n(NBOOT) + ' times by sampling its rows with replacement and recomputes the gap each time. The middle 95% of those gaps is the interval. If it covers zero, this test set cannot tell the models apart.');
  UI.legend(B.card, [{ label: 'bootstrap gaps', color: UI.colors().c[0], shape: 'square' }, { label: 'observed gap', color: UI.colors().c[1], shape: 'diamond' }, { label: 'zero', color: UI.colors().ink, shape: 'line' }, { label: '95% interval', color: UI.colors().accent, shape: 'line' }]);
  const bnote = UI.note(B.card, 'Press “Draw one test set”.', 'callout');

  function nice(v) { const x = Math.round(v), mag = Math.pow(10, Math.floor(Math.log10(x))), f = x / mag; const g = f < 1.25 ? 1 : f < 1.75 ? 1.5 : f < 2.5 ? 2 : f < 3.5 ? 3 : f < 4.5 ? 4 : f < 6 ? 5 : f < 8 ? 7 : 10; return Math.round(g * mag); }
  const theorySd = () => Math.sqrt(a1 * (1 - a1) / n + a2 * (1 - a2) / n) * 100;
  const wOf = (sd, nn) => { const x = Math.max(sd / 3, 100 / nn), mag = Math.pow(10, Math.floor(Math.log10(x))), f = x / mag; return Math.max(100 / nn, (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * mag); };
  function* simGen(my) {
    const rng = ML.rng(seed * 7919 + 17), gaps = []; const A = a1, Bb = a2, nn = n;
    for (let i = 0; i < NCMP; i++) { const k1 = ML.binomial(nn, A, rng), k2 = ML.binomial(nn, Bb, rng); gaps.push((k2 - k1) / nn * 100); if (i % 20 === 19) { if (my !== gen) return; res = { gaps: gaps.slice(), done: i + 1, a1: A, a2: Bb, n: nn }; yield (i + 1) / NCMP; } }
  }
  function run() { if (job) job.stop(); res = null; const my = ++gen; job = EVU.job(simGen(my), { progress: pg, frame: refresh, done() { if (my === gen && pendingReveal) { pendingReveal = false; box.querySelector('.reveal').innerHTML = revealText(); } } }); refresh(); }
  function refresh() {
    H.plot.redraw(); if (!res) { ['sd', 'band', 'worse', 'tie'].forEach((k) => R.set(k, '…')); R.set('true', ((a2 - a1) * 100 >= 0 ? '+' : '−') + Math.abs((a2 - a1) * 100).toFixed(1) + ' points'); R.set('theory', '…'); return; }
    const g = res.gaps, sd = ML.stats(g).sd, q = [ML.quantile(g, 0.025), ML.quantile(g, 0.975)], tr = (a2 - a1) * 100, ts = theorySd(), sg = (v) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1);
    const pos = g.filter((v) => v > 1e-9).length / g.length, neg = g.filter((v) => v < -1e-9).length / g.length, tie = 1 - pos - neg;
    R.set('true', sg(tr) + ' points'); R.set('sd', UI.f(sd, 2) + ' points'); R.set('band', sg(q[0]) + ' to ' + sg(q[1])); R.set('theory', sg(tr - 1.96 * ts) + ' to ' + sg(tr + 1.96 * ts)); R.set('tie', DU.pct(tie, 1));
    if (Math.abs(tr) < 1e-9) { R.set('worse', 'equal: A ' + DU.pct(neg, 0) + ', B ' + DU.pct(pos, 0)); hnote.innerHTML = 'The models are exactly as good. Even so, in <b>' + DU.pct(neg, 0) + '</b> of the comparisons A looks better and in <b>' + DU.pct(pos, 0) + '</b> B looks better. The middle 95% of the gaps runs from <b>' + sg(q[0]) + '</b> to <b>' + sg(q[1]) + '</b> points.'; }
    else { const worse = tr > 0 ? neg : pos; R.set('worse', DU.pct(worse, 1), worse > 0.2 ? 'bad' : worse > 0.05 ? 'warn' : 'good'); hnote.innerHTML = 'Model ' + (tr > 0 ? 'B' : 'A') + ' is truly better by <b>' + Math.abs(tr).toFixed(1) + '</b> points, yet on <b>' + DU.pct(worse, 1) + '</b> of the ' + DU.n(res.done) + ' comparisons the truly worse model scored higher (and on ' + DU.pct(tie, 1) + ' they tied). The middle 95% of the gaps runs from <b>' + sg(q[0]) + '</b> to <b>' + sg(q[1]) + '</b> points; the true gap is <b>' + sg(tr) + '</b>.'; }
  }
  H.plot.draw = (p) => {
    const col = p.col, tr = (a2 - a1) * 100, sd = theorySd(), nn = res ? res.n : n, w = wOf(sd, nn), span = 4.3 * sd + Math.abs(tr) / 2, lo = (Math.floor((tr - span) / w - 0.5) + 0.5) * w, hi = (Math.floor((tr + span) / w - 0.5) + 1.5) * w;
    const g = res ? res.gaps : [], cnt = g.length ? EVU.bin(g, lo, hi, w) : [], total = res ? res.done : 0; let mx = 10; cnt.forEach((k) => { if (k > mx) mx = k; });
    const pdfMax = NCMP * w / (sd * Math.sqrt(2 * Math.PI)); mx = Math.max(mx, pdfMax) * 1.1; const top = Math.ceil(mx / 10) * 10; p.setLims([lo, hi], [0, top]); p._layout();
    p.axes({ xlabel: 'observed gap, B minus A (accuracy points)', ylabel: 'comparisons', xticks: ML.niceTicks(lo, hi, 8), xfmt: (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(+v.toFixed(2)), yticks: ML.niceTicks(0, top, 4) });
    if (res && res.done > 20) { const q0 = ML.quantile(g, 0.025), q1 = ML.quantile(g, 0.975); p.rect(q0, 0, q1, top, { fill: col.accent, alpha: 0.09 }); }
    if (cnt.length) cnt.forEach((k, i) => { if (k) p.rect(lo + i * w + w * 0.06, 0, lo + (i + 1) * w - w * 0.06, k, { fill: col.c[0], alpha: 0.85, stroke: col.surface, w: 1 }); });
    const pts = []; for (let i = 0; i <= 120; i++) { const x = lo + (hi - lo) * i / 120; pts.push([x, NCMP * w * Math.exp(-0.5 * ((x - tr) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI))]); } p.line(pts, { color: col.c[1], w: 2.2, dash: [6, 4] });
    p.seg(tr, 0, tr, top, { color: col.c[2], w: 2.4 }); p.seg(0, 0, 0, top, { color: col.ink, w: 1.6 });
    if (res) p.setLabel('Histogram of ' + total + ' observed gaps between model B and model A; true gap ' + tr.toFixed(1) + ' points; middle 95% from ' + ML.quantile(g, 0.025).toFixed(1) + ' to ' + ML.quantile(g, 0.975).toFixed(1));
  };
  H.plot.on('hover', (e) => { if (!res || !res.done) return; const sd = theorySd(), w = wOf(sd, res.n), tr = (a2 - a1) * 100, span = 4.3 * sd + Math.abs(tr) / 2, lo = (Math.floor((tr - span) / w - 0.5) + 0.5) * w, i = Math.floor((e.x - lo) / w); if (i < 0) return UI.tip.hide(); const c0 = lo + i * w, k = res.gaps.filter((v) => v >= c0 - 1e-9 && v < c0 + w - 1e-9).length; UI.tip.show('<b>gaps from ' + c0.toFixed(1) + ' to ' + (c0 + w).toFixed(1) + '</b><br>' + k + ' of ' + res.done + ' comparisons', e.cx, e.cy); });

  /* ---- one test set with a bootstrap interval ---- */
  function draw1() {
    if (bjob) bjob.stop(); boot = null; const my = ++bgen, rng = ML.rng(bseed * 104729 + 3), A = new Uint8Array(n), Bv = new Uint8Array(n); let sa = 0, sb = 0;
    for (let i = 0; i < n; i++) { A[i] = rng() < a1 ? 1 : 0; Bv[i] = rng() < a2 ? 1 : 0; sa += A[i]; sb += Bv[i]; }
    const info = info1 = { a: sa / n, b: sb / n, gap: (sb - sa) / n * 100, n };
    function* g() { let d; yield* ML.bootstrapDiffGen(Bv, A, NBOOT, rng, false, (r) => { d = r; }); if (my !== bgen) return; boot = Object.assign(info, { diffs: Array.from(d, (v) => v * 100) }); boot.ci = ML.percentileCI(boot.diffs, 0.95); }
    bjob = EVU.job(g(), { progress: pg2, frame: () => b1(info), done() { b1(info); } }); b1(info);
  }
  function b1(info) {
    const sg = (v) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1);
    R1.set('a', DU.pct(info.a, 1)); R1.set('b', DU.pct(info.b, 1)); R1.set('gap', sg(info.gap) + ' points');
    if (boot && boot.ci) { const inc = boot.ci[0] <= 0 && boot.ci[1] >= 0; R1.set('ci', sg(boot.ci[0]) + ' to ' + sg(boot.ci[1])); R1.set('zero', inc ? 'yes' : 'no', inc ? 'warn' : 'good');
      bnote.innerHTML = 'On this test set B scored <b>' + DU.pct(info.b, 1) + '</b> and A <b>' + DU.pct(info.a, 1) + '</b>, a gap of <b>' + sg(info.gap) + '</b> points. The bootstrap says the gap could plausibly be anywhere from <b>' + sg(boot.ci[0]) + '</b> to <b>' + sg(boot.ci[1]) + '</b>' + (inc ? ': that includes zero, so this test set cannot say which model is better.' : ': zero is outside the interval, so this test set does favour ' + (boot.ci[0] > 0 ? 'B' : 'A') + '.'); }
    else { R1.set('ci', '…'); R1.set('zero', '…'); bnote.innerHTML = 'Resampling…'; }
    B.plot.redraw();
  }
  B.plot.draw = (p) => DU.bootDraw(p, boot, 'gap, B minus A (accuracy points)');
  window.addEventListener('themechange', () => { refresh(); if (info1) b1(info1); });
  run(); draw1();
})();
