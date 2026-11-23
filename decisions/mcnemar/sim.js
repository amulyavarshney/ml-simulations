/* Only the rows where the models disagree matter: McNemar's test (exact and chi-square) and a paired bootstrap, on two real classifiers or a what-if table. */
(function () {
  'use strict';
  const { stage, side } = UI.shell('decisions/mcnemar');
  const h = UI.h, NTR = 800, NMAX = 5000, NBOOT = 2000;
  let mode = 'real', n = 1000, k = 25, seed = 3, wb = 60, wc = 50, wn = 1000, D = null, S = null, boot = null, job = null, gen = 0;

  const c = UI.panel(side, 'Where the numbers come from');
  const sg = UI.seg(c, { label: 'Use', options: [{ value: 'real', label: 'Two real classifiers' }, { value: 'whatif', label: 'What-if table' }], value: mode, onChange(v) { mode = v; sync(); update(); } });
  const real = h('div'), what = h('div'); c.append(real, what);
  UI.note(real, 'Model A is a logistic regression and model B a k-nearest-neighbours vote. Both learn from ' + NTR + ' made-up applicants and are scored on the <b>same</b> test applicants, row by row.');
  const nS = UI.slider(real, { label: 'Test rows', min: 200, max: NMAX, log: true, step: 0.04, value: n, fmt: (v) => DU.n(nice(v)), onInput: UI.debounce((v) => { n = nice(v); update(); }, 150) });
  const kS = UI.slider(real, { label: 'k for model B', min: 1, max: 100, log: true, step: 0.04, value: k, fmt: (v) => String(Math.max(1, Math.round(v))), onInput: UI.debounce((v) => { k = Math.max(1, Math.round(v)); update(); }, 150) });
  UI.buttons(real, [{ label: 'New data', primary: true, onClick() { seed++; build(); } }]);
  const bS = UI.slider(what, { label: 'b: A right, B wrong', min: 0, max: 1500, step: 1, value: wb, fmt: (v) => DU.n(v), onInput: UI.debounce((v) => { wb = Math.round(v); update(); }, 120) });
  const cS = UI.slider(what, { label: 'c: B right, A wrong', min: 0, max: 1500, step: 1, value: wc, fmt: (v) => DU.n(v), onInput: UI.debounce((v) => { wc = Math.round(v); update(); }, 120) });
  const nW = UI.slider(what, { label: 'Test rows in all', min: 200, max: 20000, log: true, step: 0.04, value: wn, fmt: (v) => DU.n(nice(v)), help: 'The rows where both models agree make up the rest. Here 88% of them are both right and 12% both wrong; the test does not care.', onInput: UI.debounce((v) => { wn = nice(v); update(); }, 150) });
  const setW = (b2, c2, n2) => { wb = Math.min(1500, b2); wc = Math.min(1500, c2); wn = Math.min(20000, Math.max(200, n2)); bS.set(wb); cS.set(wc); nW.set(wn); update(); };
  UI.buttons(what, [{ label: 'b = 60, c = 50', primary: true, onClick() { setW(60, 50, 1000); } }, { label: 'Same proportions, 5 times the rows', onClick() { setW(wb * 5, wc * 5, wn * 5); } }, { label: 'Add 1,000 agreeing rows', onClick() { setW(wb, wc, wn + 1000); } }]);
  const pg = UI.progress(c);
  const rd = UI.panel(side, 'Results');
  const R = UI.read(rd, [{ id: 'accA', label: 'Accuracy of A' }, { id: 'accB', label: 'Accuracy of B' }, { id: 'diff', label: 'A minus B' }, { id: 'exact', label: 'Exact McNemar p-value' }, { id: 'chi', label: 'Chi-square statistic' }, { id: 'chip', label: 'p from the chi-square' }, { id: 'ci', label: 'Bootstrap 95% interval, A minus B' }]);

  const tcard = EVU.card(stage, 'The 2 × 2 table of right and wrong'); const tab = EVU.table(tcard, ['', 'B right', 'B wrong'], [['', '', ''], ['', '', '']], { cls: 'compact', caption: 'Test rows by whether model A and model B were right' });
  const tnote = UI.note(tcard, '', 'callout');
  const P = UI.plotCard(stage, 'If the models were equally good, each disagreement is a coin flip', { xlim: [0, 1], ylim: [0, 1], aspectFn: DU.asp(2.1, 1.4), margin: { l: 58, r: 14, t: 12, b: 44 }, hover: true, label: 'Binomial distribution of disagreements won by A' }, 'Among the b + c rows where the models disagree, count how many A wins. With no real difference that count follows a fair-coin binomial. The p-value is the area of the orange bars: the chance of a split at least as lopsided as b against c, in either direction.');
  UI.legend(P.card, [{ label: 'as lopsided as observed, or more (adds up to p)', color: UI.colors().c[1], shape: 'square' }, { label: 'less lopsided', color: UI.colors().c[0], shape: 'square' }, { label: 'observed: A wins b, B wins c', color: UI.colors().ink, shape: 'line' }]);
  const B = UI.plotCard(stage, 'The same rows, resampled: bootstrap interval of the accuracy difference', { xlim: [-8, 8], ylim: [0, 100], aspectFn: DU.asp(2.4, 1.4), margin: { l: 52, r: 14, t: 12, b: 44 }, hover: true, label: 'Bootstrap distribution of the paired accuracy difference' }, 'Resample the test rows with replacement (A and B together, so each row keeps both its answers), recompute A minus B ' + DU.n(NBOOT) + ' times, and keep the middle 95%.');
  UI.legend(B.card, [{ label: 'bootstrap differences', color: UI.colors().c[0], shape: 'square' }, { label: 'observed difference', color: UI.colors().c[1], shape: 'diamond' }, { label: 'zero', color: UI.colors().ink, shape: 'line' }, { label: '95% interval', color: UI.colors().accent, shape: 'line' }]);
  const bnote = UI.note(B.card, '', 'callout');

  /** a p-value to d decimals; tiny values read "below 0.0001" instead of a misleading 0.0000 */
  function pv(p, d) { const lim = Math.pow(10, -d); return p < lim ? 'below ' + lim.toFixed(d) : p.toFixed(d); }
  function nice(v) { const x = Math.round(v), mag = Math.pow(10, Math.floor(Math.log10(x))), f = x / mag; const g = f < 1.25 ? 1 : f < 1.75 ? 1.5 : f < 2.5 ? 2 : f < 3.5 ? 3 : f < 4.5 ? 4 : f < 6 ? 5 : f < 8 ? 7 : 10; return Math.round(g * mag); }
  function sync() { real.style.display = mode === 'real' ? '' : 'none'; what.style.display = mode === 'whatif' ? '' : 'none'; }
  function build() {
    const [tr, te] = ML.loanSplit([NTR, NMAX], ML.rng(seed * 313 + 5)), pa = ML.fitScorer('logreg', tr.X, tr.y).eval(te.X).prob(), vb = ML.fitScorer('knn', tr.X, tr.y, { kmax: 100 }).eval(te.X);
    D = { y: te.y, pa, vb, cA: new Uint8Array(NMAX), cB: null, vbk: -1 }; update();
  }
  function table() {
    if (mode === 'real') {
      if (D.vbk !== k) { const pb = D.vb.prob(k); D.cB = Uint8Array.from(pb, (v, i) => ((v >= 0.5 ? 1 : 0) === D.y[i] ? 1 : 0)); D.vbk = k; D.cA = Uint8Array.from(D.pa, (v, i) => ((v >= 0.5 ? 1 : 0) === D.y[i] ? 1 : 0)); }
      const a = D.cA.subarray(0, n), b = D.cB.subarray(0, n); let both = 0, bb = 0, cc = 0, none = 0; for (let i = 0; i < n; i++) { if (a[i] && b[i]) both++; else if (a[i]) bb++; else if (b[i]) cc++; else none++; }
      return { n, both, b: bb, c: cc, none, a, bv: b };
    }
    const nn = Math.max(wn, wb + wc), rest = nn - wb - wc, none = Math.round(0.12 * rest), both = rest - none, a = new Uint8Array(nn), bv = new Uint8Array(nn); let i = 0;
    for (let q = 0; q < both; q++, i++) { a[i] = 1; bv[i] = 1; } for (let q = 0; q < wb; q++, i++) a[i] = 1; for (let q = 0; q < wc; q++, i++) bv[i] = 1;
    return { n: nn, both, b: wb, c: wc, none, a, bv };
  }
  function update() {
    if (!D) return; if (job) job.stop(); boot = null; S = table(); const my = ++gen;
    const exact = ML.mcnemarExact(S.b, S.c), chi = ML.mcnemarChi2(S.b, S.c), accA = (S.both + S.b) / S.n, accB = (S.both + S.c) / S.n, diff = (accA - accB) * 100, sgn = (v) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1);
    tab.set([['A right', { html: '<b>' + DU.n(S.both) + '</b><br><span class="note">both right</span>' }, { html: '<b>' + DU.n(S.b) + '</b><br><span class="note">b: A right, B wrong</span>', cls: 'warn' }], ['A wrong', { html: '<b>' + DU.n(S.c) + '</b><br><span class="note">c: B right, A wrong</span>', cls: 'warn' }, { html: '<b>' + DU.n(S.none) + '</b><br><span class="note">both wrong</span>' }]]);
    R.set('accA', DU.pct(accA, 1)); R.set('accB', DU.pct(accB, 1)); R.set('diff', sgn(diff) + ' points'); R.set('exact', S.b + S.c ? pv(exact, 4) : 'no disagreements', exact < 0.05 ? 'good' : ''); R.set('chi', UI.f(chi.stat, 2)); R.set('chip', pv(chi.p, 4)); R.set('ci', '…');
    tnote.innerHTML = 'Of <b>' + DU.n(S.n) + '</b> rows the models agree on <b>' + DU.n(S.both + S.none) + '</b>, and those rows play no part in the test. Only <b>b = ' + DU.n(S.b) + '</b> against <b>c = ' + DU.n(S.c) + '</b> counts: the exact p-value is <b>' + pv(exact, 3) + '</b> (chi-square: ' + pv(chi.p, 3) + '), so ' + (exact < 0.05 ? 'a split this lopsided would happen less than 1 time in 20 by chance alone.' : 'the data do not show that one model is better.');
    P.plot.redraw(); bnote.innerHTML = 'Resampling…';
    const info = { gap: diff, n: S.n }, rng = ML.rng(seed * 6007 + 11 + mode.length);
    function* g() { let d; yield* ML.bootstrapDiffGen(S.a, S.bv, NBOOT, rng, true, (r) => { d = r; }); if (my !== gen) return; boot = Object.assign(info, { diffs: Array.from(d, (v) => v * 100) }); boot.ci = ML.percentileCI(boot.diffs, 0.95); }
    job = EVU.job(g(), { progress: pg, done() { if (my !== gen) return; R.set('ci', sgn(boot.ci[0]) + ' to ' + sgn(boot.ci[1])); const inc = boot.ci[0] <= 0 && boot.ci[1] >= 0; bnote.innerHTML = 'A minus B is <b>' + sgn(diff) + '</b> points; the bootstrap interval runs from <b>' + sgn(boot.ci[0]) + '</b> to <b>' + sgn(boot.ci[1]) + '</b> points, which ' + (inc ? '<b>includes zero</b>. It agrees with the McNemar test: no clear winner.' : '<b>excludes zero</b>. It agrees with the McNemar test: one model is better.'); B.plot.redraw(); } });
    B.plot.redraw();
  }
  const lg = ML.lgamma, pmf = (nn, q) => Math.exp(lg(nn + 1) - lg(q + 1) - lg(nn - q + 1) - nn * Math.LN2);
  function view() { const nn = S.b + S.c, mean = nn / 2, sd = Math.sqrt(nn) / 2, lo = Math.max(0, Math.floor(Math.min(mean - 4.6 * sd, S.b - 2, S.c - 2))), hi = Math.min(nn, Math.ceil(Math.max(mean + 4.6 * sd, S.b + 2, S.c + 2))); return { nn, lo, hi }; }
  P.plot.draw = (p) => {
    if (!S) return; const col = p.col, { nn, lo, hi } = view();
    if (nn === 0) { p.setLims([0, 1], [0, 1]); p._layout(); p.axes({ xlabel: 'disagreements won by A' }); p.text(0.5, 0.5, 'The models never disagree: nothing to test (p = 1).', { align: 'center', weight: 600 }); return; }
    let mx = 0; for (let q = lo; q <= hi; q++) mx = Math.max(mx, pmf(nn, q)); const top = mx * 1.12; p.setLims([lo - 0.5, hi + 0.5], [0, top]); p._layout();
    p.axes({ xlabel: 'disagreements won by A, out of b + c = ' + DU.n(nn), ylabel: 'probability', xticks: ML.niceTicks(lo, hi, 8), xfmt: (v) => DU.n(v), yfmt: (v) => +v.toFixed(3) + '', yticks: ML.niceTicks(0, top, 4) });
    const mn = Math.min(S.b, S.c), mxk = Math.max(S.b, S.c); for (let q = lo; q <= hi; q++) { const tail = q <= mn || q >= mxk; p.rect(q - 0.46, 0, q + 0.46, pmf(nn, q), { fill: tail ? col.c[1] : col.c[0], alpha: 0.9 }); }
    p.seg(S.b, 0, S.b, top, { color: col.ink, w: 2 }); p.seg(S.c, 0, S.c, top, { color: col.ink, w: 2, dash: [5, 4] });
    p.text(S.b, top * 0.97, ' b = ' + S.b, { align: S.b >= S.c ? 'left' : 'right', halo: true, weight: 700, dx: S.b >= S.c ? 4 : -4 }); p.text(S.c, top * 0.88, ' c = ' + S.c, { align: S.c > S.b ? 'left' : 'right', halo: true, weight: 700, dx: S.c > S.b ? 4 : -4 });
    p.setLabel('Binomial distribution of disagreements won by A out of ' + nn + '; observed b ' + S.b + ', c ' + S.c + '; exact p ' + pv(ML.mcnemarExact(S.b, S.c), 3));
  };
  P.plot.on('hover', (e) => { if (!S) return; const nn = S.b + S.c, q = Math.round(e.x); if (nn === 0 || q < 0 || q > nn) return UI.tip.hide(); UI.tip.show('<b>A wins ' + DU.n(q) + ' of ' + DU.n(nn) + '</b><br>chance if equally good: ' + (100 * pmf(nn, q)).toFixed(2) + '%', e.cx, e.cy); });
  B.plot.draw = (p) => DU.bootDraw(p, boot, 'A minus B (accuracy points)');
  window.addEventListener('themechange', () => { P.plot.redraw(); B.plot.redraw(); });
  sync(); build();
})();
