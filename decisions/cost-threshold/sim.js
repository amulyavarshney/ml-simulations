/* Pick the cut-off from the costs, not from 0.5: profit against the approval threshold for calibrated and uncalibrated probabilities. */
(function () {
  'use strict';
  const { stage, side } = UI.shell('decisions/cost-threshold');
  const h = UI.h, NTR = 800, NTE = 3000, NSET = 20;
  let gain = 1000, loss = 9000, t = 0.5, naive = false, seed = 3, D = null, multi = null, job = null, gen = 0;

  const box = UI.predict(side, { title: 'Predict first', q: 'A repaid loan earns <b>1</b>; a default loses <b>9</b>; rejecting earns nothing. If the probabilities are calibrated, at what P(repay) should you <b>start approving</b>?', options: ['0.5', '0.7', '0.9', '0.99'], answer: 2,
    reveal: 'Press a button to see the answer.',
    onReveal() { gain = 1000; loss = 9000; naive = false; gS.set(1000); lS.set(9000); nbBox.set(false); setT(loss / (gain + loss)); box.querySelector('.reveal').innerHTML = revealText(); } });
  function revealText() {
    const s = multi && multi.done ? summary('lr') : null;
    return '<b>0.9.</b> Approving earns <i>gain</i> × P(repay) − <i>loss</i> × (1 − P(repay)), which is above zero when P(repay) is above loss / (gain + loss) = 9 / 10. The page has set the cut-off to 0.90. ' + (s ? 'On ' + s.n + ' other datasets of 3,000 applicants, the best cut-off found on the data for a calibrated logistic regression ranged from <b>' + UI.f(s.min, 2) + '</b> to <b>' + UI.f(s.max, 2) + '</b> (mean <b>' + UI.f(s.mean, 2) + '</b>): the formula is the right target, and the data add a little noise around it.' : 'The strip plot below is still being computed.');
  }

  const c = UI.panel(side, 'The money');
  const gS = UI.slider(c, { label: 'Profit per repaid loan', min: 100, max: 5000, step: 100, value: gain, fmt: (v) => DU.n(v), onInput(v) { gain = Math.round(v); refresh(); } });
  const lS = UI.slider(c, { label: 'Loss per default', min: 500, max: 20000, step: 500, value: loss, fmt: (v) => DU.n(v), help: 'Rejecting an applicant earns 0.', onInput(v) { loss = Math.round(v); refresh(); } });
  const c2 = UI.panel(side, 'The decision');
  const tS = UI.slider(c2, { label: 'Approve if P(repay) is at least', min: 0.05, max: 0.99, step: 0.01, value: t, fmt: (v) => v.toFixed(2), onInput(v) { t = v; refresh(); } });
  const btn = UI.buttons(c2, [{ id: 'f', label: 'Use the formula', onClick() { setT(loss / (gain + loss)); } }, { id: 'b', label: 'Use the best found', onClick() { setT(gridBest(D.curve[naive ? 'nb' : 'lr']).t); } }]);
  const nbBox = UI.check(c2, { label: 'Use an uncalibrated model (naive Bayes)', value: false, help: 'Same applicants, but the probabilities come from a model that is over-confident.', onChange(v) { naive = v; refresh(); } });
  UI.buttons(c2, [{ label: 'New applicants', primary: true, onClick() { seed++; build(); } }]);
  UI.note(c2, 'Logistic regression and naive Bayes learn from ' + NTR + ' made-up applicants and are scored on ' + DU.n(NTE) + ' fresh ones. About 20% default.');
  const rd = UI.panel(side, 'At this cut-off');
  const R = UI.read(rd, [{ id: 'profit', label: 'Total profit' }, { id: 'appr', label: 'Approval rate' }, { id: 'defs', label: 'Defaults let through' }, { id: 'formula', label: 'Formula: loss / (gain + loss)' }, { id: 'best', label: 'Best cut-off on these rows' }, { id: 'bestp', label: 'Profit at the best cut-off' }, { id: 'bestg', label: 'Best step of the slider (0.01)' }]);
  const pg = UI.progress(rd);

  const tcard = EVU.card(stage, 'Decisions against outcomes at this cut-off'); const dt = DU.decisionTable(tcard);
  const tnote = UI.note(tcard, '', 'callout');
  const P = UI.plotCard(stage, 'Total profit against the cut-off', { xlim: [0, 1], ylim: [-1, 1], aspectFn: DU.asp(1.9, 1.3), margin: { l: 82, r: 14, t: 12, b: 42 }, hover: true, label: 'Total profit against the approval cut-off' }, 'Each point is the profit you would have made on these 3,000 applicants if you approved everyone at or above that cut-off. Click the plot to move the cut-off there. The diamond is the exact peak; the slider moves in steps of 0.01, so it can only show the best step. The curve is flat near its top, so a cut-off a little off the best one costs little.');
  UI.legend(P.card, [{ label: 'profit', color: UI.colors().c[0], shape: 'line' }, { label: 'cut-off 0.5', color: UI.colors().muted, shape: 'dash' }, { label: 'formula', color: UI.colors().c[2], shape: 'line' }, { label: 'exact peak on these rows', color: UI.colors().c[1], shape: 'diamond' }, { label: 'your cut-off', color: UI.colors().ink, shape: 'circle' }]);
  const S = UI.plotCard(stage, 'The best cut-off found on ' + NSET + ' other datasets', { xlim: [0, 1], ylim: [-0.7, 1.7], aspectFn: DU.asp(3.1, 1.7), margin: { l: 92, r: 14, t: 12, b: 42 }, hover: true, label: 'Best cut-off found on 20 datasets for logistic regression and naive Bayes' }, 'One dot per dataset of ' + DU.n(NTE) + ' applicants; the black bar is the average. The green line is the formula.');
  const snote = UI.note(S.card, 'Computing…', 'callout');

  function dataFor(sd) {
    const [tr, te] = ML.loanSplit([NTR, NTE], ML.rng(sd * 4241 + 3)), pl = ML.fitScorer('logreg', tr.X, tr.y).eval(te.X).prob(), pn = ML.fitScorer('nb', tr.X, tr.y).eval(te.X).prob();
    return { y: te.y, p: { lr: pl, nb: pn }, curve: { lr: ML.costCurve(pl, te.y), nb: ML.costCurve(pn, te.y) } };
  }
  function setT(v) { t = UI.clamp(Math.round(v * 100) / 100, 0.05, 0.99); tS.set(t); refresh(); }
  /** the best cut-off the slider can actually show (steps of 0.01), with its profit: the exact peak of the curve usually lies between two steps */
  function gridBest(cv) { let bt = 0.05, bp = -Infinity; for (let i = 5; i <= 99; i++) { const v = cv.at(i / 100, gain, loss).profit; if (v > bp + 1e-9) { bp = v; bt = i / 100; } } return { t: bt, profit: bp }; }
  function build() { D = dataFor(seed); multi = null; if (job) job.stop(); refresh(); const my = ++gen; job = EVU.job(multiGen(my), { progress: pg, frame: () => { S.plot.redraw(); sumText(); } }); }
  function* multiGen(my) { const m = { curves: [], done: 0 }; for (let s = 0; s < NSET; s++) { if (my !== gen) return; m.curves.push(dataFor(1000 + seed * 100 + s).curve); m.done = s + 1; multi = m; yield (s + 1) / NSET; } }
  function summary(kind) {
    if (!multi || !multi.done) return null; const ts = [], ratio = [];
    multi.curves.forEach((cv) => { const q = cv[kind], b = q.best(gain, loss), f = q.at(loss / (gain + loss), gain, loss); ts.push(b.t); ratio.push(b.profit > 0 ? f.profit / b.profit : NaN); });
    const sorted = ts.slice().sort((a, b) => a - b), r = ratio.filter((v) => isFinite(v));
    return { n: multi.done, ts, min: sorted[0], max: sorted[sorted.length - 1], mean: ML.mean(ts), sd: ML.stats(ts).sd, ratio: r.length ? ML.mean(r) : NaN };
  }
  function sumText() {
    const a = summary('lr'), b = summary('nb'), F = loss / (gain + loss); if (!a) return;
    snote.innerHTML = '<b>Logistic regression (calibrated):</b> best cut-off from <b>' + UI.f(a.min, 2) + '</b> to <b>' + UI.f(a.max, 2) + '</b>, mean <b>' + UI.f(a.mean, 2) + '</b>, against the formula’s <b>' + UI.f(F, 2) + '</b>. Using the formula earned on average <b>' + DU.pct(a.ratio) + '</b> of the best profit.<br><b>Naive Bayes (over-confident):</b> best cut-off from <b>' + UI.f(b.min, 2) + '</b> to <b>' + UI.f(b.max, 2) + '</b>, mean <b>' + UI.f(b.mean, 2) + '</b>. Using the formula earned on average <b>' + DU.pct(b.ratio) + '</b> of the best profit.';
  }
  function refresh() {
    const kind = naive ? 'nb' : 'lr', cv = D.curve[kind], F = loss / (gain + loss), b = cv.best(gain, loss), gb = gridBest(cv), a = cv.at(t, gain, loss), n = cv.n;
    dt.set({ apRep: a.repaid, apDef: a.defaults, reRep: cv.nRepay - a.repaid, reDef: cv.nDefault - a.defaults }, gain, loss);
    R.set('profit', DU.signed(a.profit), a.profit >= 0 ? 'good' : 'bad'); R.set('appr', DU.pct(a.approved / n, 1)); R.set('defs', DU.n(a.defaults) + (a.approved ? ' (' + DU.pct(a.defaults / a.approved, 1) + ' of approved)' : ''));
    R.set('formula', F.toFixed(2)); R.set('best', b.t.toFixed(3)); R.set('bestp', DU.signed(b.profit)); R.set('bestg', gb.t.toFixed(2) + ' (' + DU.signed(gb.profit) + ')');
    const f = cv.at(F, gain, loss);
    tnote.innerHTML = (naive ? '<b>Naive Bayes.</b> ' : '<b>Logistic regression.</b> ') + 'Cut-off ' + t.toFixed(2) + ' earns <b>' + DU.signed(a.profit) + '</b>. The exact peak of the curve on these rows is at <b>' + b.t.toFixed(3) + '</b> (profit <b>' + DU.signed(b.profit) + '</b>); the slider moves in steps of 0.01, and its best step is <b>' + gb.t.toFixed(2) + '</b> (profit <b>' + DU.signed(gb.profit) + '</b>). The formula gives <b>' + F.toFixed(2) + '</b> (profit <b>' + DU.signed(f.profit) + '</b>' + (b.profit > 0 ? ', ' + DU.pct(f.profit / b.profit) + ' of the exact peak' : '') + ').';
    P.plot.redraw(); S.plot.redraw(); sumText();
  }
  P.plot.draw = (p) => {
    const col = p.col, cv = D.curve[naive ? 'nb' : 'lr'], F = loss / (gain + loss), N = 200, pts = []; let lo = 0, hi = 0;
    for (let i = 0; i <= N; i++) { const v = cv.at(i / N, gain, loss).profit; pts.push([i / N, v]); if (v < lo) lo = v; if (v > hi) hi = v; }
    const pad = (hi - lo) * 0.08 || 1; p.setLims([0, 1], [lo - pad, hi + pad]); p._layout();
    p.axes({ zero: true, xlabel: 'cut-off: approve if P(repay) is at least', ylabel: 'total profit', xfmt: (v) => v.toFixed(1), yfmt: (v) => DU.money(v) });
    p.seg(0.5, p.vy[0], 0.5, p.vy[1], { color: col.muted, w: 1.8, dash: [6, 5] }); p.seg(F, p.vy[0], F, p.vy[1], { color: col.c[2], w: 2.4 });
    p.line(pts, { color: col.c[0], w: 3 });
    const b = cv.best(gain, loss); p.dot(b.t, b.profit, { fill: col.c[1], shape: 'diamond', r: 7 });
    const a = cv.at(t, gain, loss); p.seg(t, p.vy[0], t, p.vy[1], { color: col.ink, w: 1.2, alpha: 0.6 }); p.dot(t, a.profit, { fill: col.ink, r: 5.5, stroke: col.surface });
    p.setLabel('Total profit against the cut-off for ' + (naive ? 'naive Bayes' : 'logistic regression') + ': at ' + t.toFixed(2) + ' the profit is ' + DU.signed(a.profit) + '; exact peak ' + b.t.toFixed(3) + ' with ' + DU.signed(b.profit) + '; formula ' + F.toFixed(2));
  };
  P.plot.on('hover', (e) => { if (e.x < 0 || e.x > 1) return UI.tip.hide(); const a = D.curve[naive ? 'nb' : 'lr'].at(e.x, gain, loss); UI.tip.show('<b>cut-off ' + e.x.toFixed(2) + '</b><br>profit ' + DU.signed(a.profit) + '<br>approves ' + DU.pct(a.approved / NTE, 0), e.cx, e.cy); });
  P.plot.canvas.addEventListener('pointerdown', (ev) => { const r = P.plot.canvas.getBoundingClientRect(), x = P.plot.iX((ev.clientX - r.left) * (P.plot.W / r.width)); if (x >= 0.05 && x <= 0.99) setT(x); });
  P.plot.canvas.tabIndex = 0; P.plot.canvas.addEventListener('keydown', (ev) => { const d = ev.key === 'ArrowRight' ? 0.01 : ev.key === 'ArrowLeft' ? -0.01 : 0; if (d) { ev.preventDefault(); setT(t + d); } });
  S.plot.draw = (p) => {
    const col = p.col, F = loss / (gain + loss), A = summary('lr'), B = summary('nb'); let lo = Math.min(F, A ? A.min : F, B ? B.min : F), hi = Math.max(F, A ? A.max : F, B ? B.max : F); lo = Math.max(0, Math.floor((lo - 0.04) * 20) / 20); hi = Math.min(1, Math.ceil((hi + 0.03) * 20) / 20);
    p.setLims([lo, hi], [-0.7, 1.7]); p._layout(); p.axes({ xlabel: 'best cut-off found on the data', yticks: [0, 1], yfmt: (v) => (v === 1 ? 'logistic' : v === 0 ? 'naive Bayes' : ''), xfmt: (v) => v.toFixed(2), grid: true });
    p.seg(F, p.vy[0], F, p.vy[1], { color: col.c[2], w: 2.4 });
    [[A, 1, col.c[0], 'circle'], [B, 0, col.c[1], 'triangle']].forEach(([s, y, c2, sh]) => { if (!s) return; const r = ML.rng(9 + y); s.ts.forEach((v) => p.dot(v, y + (r() - 0.5) * 0.6, { fill: c2, shape: sh, r: 4.5, alpha: 0.85 })); p.seg(s.mean, y - 0.4, s.mean, y + 0.4, { color: col.ink, w: 3 }); });
    p.setLabel('Best cut-off on ' + NSET + ' datasets: ' + (A ? 'logistic from ' + A.min.toFixed(2) + ' to ' + A.max.toFixed(2) : 'computing') + (B ? '; naive Bayes from ' + B.min.toFixed(2) + ' to ' + B.max.toFixed(2) : '') + '; formula ' + F.toFixed(2));
  };
  S.plot.on('hover', (e) => { const y = Math.round(e.y), s = y === 1 ? summary('lr') : y === 0 ? summary('nb') : null; if (!s) return UI.tip.hide(); UI.tip.show('<b>' + (y ? 'logistic regression' : 'naive Bayes') + '</b><br>best cut-off from ' + s.min.toFixed(2) + ' to ' + s.max.toFixed(2) + '<br>mean ' + s.mean.toFixed(2) + ', sd ' + s.sd.toFixed(2), e.cx, e.cy); });
  window.addEventListener('themechange', () => { refresh(); });
  build();
})();
