/* Same accuracy, different errors by group: one threshold or one per group on a made-up two-group loan table; approval rate, TPR, FPR, precision, accuracy and profit by group. */
(function () {
  'use strict';
  const { stage, side } = UI.shell('decisions/group-metrics');
  const h = UI.h, NTR = 2000, NTE = 6000, GAIN = 1000, LOSS = 9000;
  let mode = 'one', tG = 0.8, tA = 0.8, tB = 0.8, seed = 1, D = null, last = '', lastExtra = '';

  const c = UI.panel(side, 'Thresholds');
  const sg = UI.seg(c, { label: 'Approve if P(repay) is at least', options: [{ value: 'one', label: 'One threshold for everyone' }, { value: 'per', label: 'One per group' }], value: mode, onChange(v) { mode = v; if (v === 'per') { tA = tG; tB = tG; sA.set(tA); sB.set(tB); } else { tG = tA; sG.set(tG); } sync(); refresh(); } });
  const sG = UI.slider(c, { label: 'Threshold for everyone', min: 0.05, max: 0.99, step: 0.01, value: tG, fmt: (v) => v.toFixed(2), onInput(v) { tG = v; last = ''; refresh(); } });
  const sA = UI.slider(c, { label: 'Threshold for group A', min: 0.05, max: 0.99, step: 0.01, value: tA, fmt: (v) => v.toFixed(2), onInput(v) { tA = v; last = ''; refresh(); } });
  const sB = UI.slider(c, { label: 'Threshold for group B', min: 0.05, max: 0.99, step: 0.01, value: tB, fmt: (v) => v.toFixed(2), onInput(v) { tB = v; last = ''; refresh(); } });
  const c2 = UI.panel(side, 'Make one measure equal');
  UI.note(c2, 'Group A keeps its threshold; group B’s threshold is moved until B’s figure is as close as it can get to A’s. Then look at what happened to the other rows of the table.');
  const bt = UI.buttons(c2, [{ id: 'approval', label: 'Approval rate', onClick() { match('approval', 'approval rate'); } }, { id: 'tpr', label: 'Good applicants approved (TPR)', onClick() { match('tpr', 'share of good applicants approved'); } }, { id: 'fpr', label: 'Defaulters approved (FPR)', onClick() { match('fpr', 'share of defaulters approved'); } }, { id: 'precision', label: 'Precision', onClick() { match('precision', 'precision'); } }, { id: 'accuracy', label: 'Accuracy', onClick() { match('accuracy', 'accuracy'); } }]);
  UI.buttons(c2, [{ label: 'New applicants', primary: true, onClick() { seed++; build(); } }]);
  const rd = UI.panel(side, 'All applicants together');
  const R = UI.read(rd, [{ id: 'acc', label: 'Overall accuracy' }, { id: 'appr', label: 'Overall approval rate' }, { id: 'profit', label: 'Overall profit' }]);
  UI.note(rd, 'Profit counts +' + DU.n(GAIN) + ' for each repaid loan approved and −' + DU.n(LOSS) + ' for each default approved, as on the cut-off page.');

  const row = h('div', { class: 'row' }); stage.append(row); row.style.gridTemplateColumns = 'repeat(auto-fit, minmax(300px, 1fr))'; row.style.alignItems = 'start';
  const mkH = (title) => UI.plotCard(row, title, { xlim: [0, 1], ylim: [0, 100], aspectFn: DU.asp(1.6, 1.4), margin: { l: 46, r: 12, t: 12, b: 44 }, hover: true, label: 'Histogram of predicted probabilities, ' + title }, ' ');
  const HA = mkH('Group A: predicted P(repay)'), HB = mkH('Group B: predicted P(repay)'), hs = [HA, HB];
  UI.legend(HB.card, [{ label: 'repaid', color: UI.colors().c[0], shape: 'square' }, { label: 'defaulted', color: UI.colors().c[7], shape: 'square' }, { label: 'threshold', color: UI.colors().ink, shape: 'line' }]);
  const T = EVU.card(stage, 'What the same model does in each group');
  const tab = EVU.table(T, ['', 'Group A', 'Group B', 'B \u2212 A', 'All'], Array.from({ length: 10 }, () => ['', '', '', '', '']), { cls: 'compact', caption: 'Counts and rates by group at the chosen thresholds' });
  const tnote = UI.note(T, '', 'callout');
  UI.note(T, 'These are measurements on made-up applicants, not claims about any real population. The two groups are drawn from different distributions, so their scores and repay rates differ by construction. <b>Which of these figures to make equal is a policy choice, not a statistic:</b> the table shows what each choice costs on the others; it does not say which is right. The slides used a different made-up generator (30,000 applicants, 35% of them in group B, a cut-off of 0.90), so their rates differ from the ones on this page.');

  function sync() { sG.el.style.display = mode === 'one' ? '' : 'none'; sA.el.style.display = mode === 'per' ? '' : 'none'; sB.el.style.display = mode === 'per' ? '' : 'none'; }
  function thr() { return mode === 'one' ? [tG, tG] : [tA, tB]; }
  function build() {
    const rng = ML.rng(seed * 17 + 1), tr = ML.loanGroups(NTR, rng), te = ML.loanGroups(NTE, rng), p = ML.fitScorer('logreg', tr.X, tr.y).eval(te.X).prob(); D = { p, y: te.y, g: te.g }; last = ''; refresh();
  }
  function match(metric, name) {
    const a = mode === 'one' ? tG : tA; if (mode === 'one') { mode = 'per'; tA = tG; sA.set(tA); sg.set('per'); sync(); }
    const mA = ML.groupMetrics(D.p, D.y, D.g, [a, a], GAIN, LOSS).groups[0], tb = ML.matchThreshold(D.p, D.y, D.g, 1, metric, mA[metric]); tB = Math.min(0.99, Math.max(0.05, Math.round(tb * 100) / 100)); sB.set(tB); last = name; lastExtra = metric === 'accuracy' ? accNote(mA.accuracy) : ''; refresh();
  }
  /** Accuracy rises and then falls as the cut-off moves, so group B's accuracy can equal A's at two cut-offs. Scan a 0.01 grid for every match. */
  function accMatches(target) {
    const acc = []; for (let i = 5; i <= 99; i++) acc.push([i / 100, ML.groupMetrics(D.p, D.y, D.g, [2, i / 100], 0, 0).groups[1].accuracy]);
    const hits = []; for (let i = 1; i < acc.length; i++) {
      const d0 = acc[i - 1][1] - target, d1 = acc[i][1] - target; if (d0 * d1 > 0) continue;
      const k = Math.abs(d0) <= Math.abs(d1) ? i - 1 : i, last2 = hits[hits.length - 1];
      if (last2 && acc[k][0] - last2[0] < 0.05) { if (Math.abs(acc[k][1] - target) < Math.abs(last2[1] - target)) hits[hits.length - 1] = acc[k]; } else hits.push(acc[k]);
    }
    return hits;
  }
  function accNote(target) {
    const others = accMatches(target).filter((h) => Math.abs(h[0] - tB) > 0.04); if (!others.length) return '';
    const used = ML.groupMetrics(D.p, D.y, D.g, [2, tB], 0, 0).groups[1].accuracy, list = [[tB, used]].concat(others).sort((x, y) => x[0] - y[0]).map((h) => '<b>' + h[0].toFixed(2) + '</b> (' + DU.pct(h[1], 1) + ')');
    const closer = Math.abs(used - target) <= Math.min(...others.map((h) => Math.abs(h[1] - target)));
    return 'Accuracy rises and then falls as the cut-off moves, so group B’s accuracy equals A’s (' + DU.pct(target, 1) + ') at more than one cut-off: ' + (list.length === 2 ? list.join(' and ') : list.join(', ')) + '. The button used <b>' + tB.toFixed(2) + '</b>' + (closer ? ', the closer match' : '') + '. Move B’s slider to another of these cut-offs to see that case. ';
  }
  const pc = (v) => DU.pct(v, 1);
  function refresh() {
    if (!D) return; const t = thr(), m = ML.groupMetrics(D.p, D.y, D.g, t, GAIN, LOSS), A = m.groups[0], B = m.groups[1], All = m.all, diff = (x, y) => { const d = 100 * (y - x); return (d >= 0 ? '+' : '−') + Math.abs(d).toFixed(1); };
    const rows = [['Applicants', DU.n(A.n), DU.n(B.n), '', DU.n(All.n)], ['Would repay', pc(A.repayRate), pc(B.repayRate), diff(A.repayRate, B.repayRate), pc(All.repayRate)], ['Threshold', t[0].toFixed(2), t[1].toFixed(2), '', mode === 'one' ? t[0].toFixed(2) : 'differs'],
      ['Approval rate', pc(A.approval), pc(B.approval), diff(A.approval, B.approval), pc(All.approval)], ['Good approved (TPR)', pc(A.tpr), pc(B.tpr), diff(A.tpr, B.tpr), pc(All.tpr)], ['Defaulters approved (FPR)', pc(A.fpr), pc(B.fpr), diff(A.fpr, B.fpr), pc(All.fpr)],
      ['Precision', pc(A.precision), pc(B.precision), diff(A.precision, B.precision), pc(All.precision)], ['Accuracy', pc(A.accuracy), pc(B.accuracy), diff(A.accuracy, B.accuracy), pc(All.accuracy)], ['Profit', DU.signed(A.profit), DU.signed(B.profit), '', DU.signed(All.profit)], ['Defaults approved', DU.n(A.fp), DU.n(B.fp), '', DU.n(All.fp)]];
    const eq = { approval: 3, tpr: 4, fpr: 5, precision: 6, accuracy: 7 };
    tab.set(rows.map((r, i) => r.map((cell, j) => (j === 3 && cell ? { text: cell, cls: Math.abs(parseFloat(cell.replace('−', '-'))) < 1 ? 'good' : '' } : cell))));
    R.set('acc', pc(All.accuracy)); R.set('appr', pc(All.approval)); R.set('profit', DU.signed(All.profit), All.profit >= 0 ? 'good' : 'bad');
    tnote.innerHTML = (last && mode === 'per' ? 'Group B’s threshold was moved to match the <b>' + last + '</b>. ' + lastExtra : '') + 'Overall accuracy is <b>' + pc(All.accuracy) + '</b>, but group A’s is <b>' + pc(A.accuracy) + '</b> and group B’s <b>' + pc(B.accuracy) + '</b>. Approval rates are <b>' + pc(A.approval) + '</b> and <b>' + pc(B.approval) + '</b>; the share of good applicants approved is <b>' + pc(A.tpr) + '</b> and <b>' + pc(B.tpr) + '</b>; the share of defaulters approved is <b>' + pc(A.fpr) + '</b> and <b>' + pc(B.fpr) + '</b>; precision is <b>' + pc(A.precision) + '</b> and <b>' + pc(B.precision) + '</b>.';
    HA.plot.redraw(); HB.plot.redraw();
  }
  hs.forEach((H, gi) => {
    H.plot.draw = (p) => {
      if (!D) return; const col = p.col, w = 0.05, rep = new Array(20).fill(0), def = new Array(20).fill(0);
      for (let i = 0; i < D.p.length; i++) if (D.g[i] === gi) { const b = Math.min(19, Math.floor(D.p[i] / w)); if (D.y[i] > 0) rep[b]++; else def[b]++; }
      let mx = 10; for (let i = 0; i < 20; i++) mx = Math.max(mx, rep[i] + def[i]); const top = Math.ceil(mx * 1.08 / 50) * 50; p.setLims([0, 1], [0, top]); p._layout();
      p.axes({ xlabel: 'predicted probability of repaying', ylabel: 'applicants', xticks: [0, 0.2, 0.4, 0.6, 0.8, 1], xfmt: (v) => v.toFixed(1), yticks: ML.niceTicks(0, top, 4) });
      for (let i = 0; i < 20; i++) { p.rect(i * w + 0.003, 0, (i + 1) * w - 0.003, rep[i], { fill: col.c[0], alpha: 0.88, stroke: col.surface, w: 1 }); p.rect(i * w + 0.003, rep[i], (i + 1) * w - 0.003, rep[i] + def[i], { fill: col.c[7], alpha: 0.88, stroke: col.surface, w: 1 }); }
      const t = thr()[gi]; p.seg(t, 0, t, top, { color: col.ink, w: 2.4 });
      p.setLabel('Group ' + 'AB'[gi] + ': histogram of predicted probability of repaying, repaid and defaulted stacked; threshold ' + t.toFixed(2));
    };
    H.plot.on('hover', (e) => { if (!D) return; const i = Math.floor(e.x / 0.05); if (i < 0 || i > 19) return UI.tip.hide(); let r = 0, d = 0; for (let q = 0; q < D.p.length; q++) if (D.g[q] === gi && Math.min(19, Math.floor(D.p[q] / 0.05)) === i) { if (D.y[q] > 0) r++; else d++; } UI.tip.show('<b>predicted ' + DU.edge(i * 0.05) + ' to ' + DU.edge((i + 1) * 0.05) + '</b><br>' + DU.n(r + d) + ' applicants: ' + DU.n(r) + ' repaid, ' + DU.n(d) + ' defaulted', e.cx, e.cy); });
  });
  window.addEventListener('themechange', () => { refresh(); });
  sync(); build();
})();
