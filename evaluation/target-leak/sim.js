/* The churn model with 0.99 AUC that is useless: columns written by the churn event look brilliant offline and fail on the day of the decision. */
(function () {
  'use strict';
  const { stage, side } = UI.shell('evaluation/target-leak');
  const h = UI.h, NR = 6000, COLS = ML.CHURN_COLUMNS, HONEST = COLS.filter((c) => c.known).map((c) => c.id);
  let seed = 1, rows = null, y = null, folds = null, sel = new Set(COLS.map((c) => c.id)), mine = null, honest = null, alone = {}, view = 'offline', job = null, gen = 0, busy = false;

  const c = UI.panel(side, 'Customers');
  UI.buttons(c, [{ label: 'New customers', onClick() { seed++; build(); } }]);
  UI.note(c, NR.toLocaleString('en-US') + ' made-up customers, about a quarter of whom churn. The model is logistic regression on the ticked columns, scored by AUC (1 is perfect, 0.5 is a coin flip).');
  const pg = UI.progress(c);
  const how = UI.panel(side, 'Two ways to score the same model');
  UI.note(how, '<b>Offline table:</b> the rows as they were recorded, after the outcome is known. Scored with random 5-fold cross-validation and with a split by time (train on months 1–9, test on months 10–12).');
  UI.note(how, '<b>Live snapshot:</b> the same customers the day <i>before</i> they decide. The survey has not been sent (0), no refund has been issued (0), and days since last login looks ordinary. This is what the model meets in use.');

  const colCard = EVU.card(stage, 'Columns: tick the ones the model may use'); const list = h('div', { role: 'group', 'aria-label': 'Columns the model may use' }); colCard.append(list);
  const btnRow = UI.buttons(colCard, [{ label: 'All columns', onClick() { sel = new Set(COLS.map((q) => q.id)); syncBoxes(); evaluate(); } }, { label: 'Only columns known at prediction time', onClick() { sel = new Set(HONEST); syncBoxes(); evaluate(); } }]);
  const boxes = {}, aloneEl = {}, coefEl = {};
  COLS.forEach((cl) => {
    const cb = h('input', { type: 'checkbox', id: 'col-' + cl.id, checked: true }); boxes[cl.id] = cb; cb.addEventListener('change', () => { if (cb.checked) sel.add(cl.id); else sel.delete(cl.id); evaluate(); });
    const a = h('span', { class: 'mono', style: { minWidth: '44px', textAlign: 'right' }, text: '–' }), bar = h('span', { style: { display: 'inline-block', height: '10px', width: '0', background: 'var(--c1)', borderRadius: '2px' } }), cwrap = h('span', { style: { display: 'inline-block', width: '70px' } }, bar);
    aloneEl[cl.id] = a; coefEl[cl.id] = bar;
    list.append(h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '4px 14px', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--line)' } },
      h('label', { class: 'check', for: 'col-' + cl.id, style: { flex: '1 1 330px' } }, cb, h('span', { class: 'mono', text: cl.id === 'm2m' ? 'contract (month-to-month = 1)' : cl.label.replace(' (months)', '').replace(' (last 30 days)', '').replace(' (vs last quarter)', '') })),
      h('span', { style: { display: 'inline-flex', flexWrap: 'wrap', gap: '4px 14px', alignItems: 'center' } },
        h('span', { class: 'badge', style: cl.known ? null : { color: 'var(--bad)', borderColor: 'var(--bad)' }, text: 'known at prediction time? ' + (cl.known ? 'yes' : 'NO') }),
        h('span', { class: 'note', style: { display: 'inline-flex', gap: '6px', alignItems: 'center' } }, 'AUC alone', a), h('span', { class: 'note', style: { display: 'inline-flex', gap: '6px', alignItems: 'center' } }, 'weight', cwrap))));
  });
  UI.note(colCard, 'Column names are shown as in the table. \u201cAUC alone\u201d scores each column on its own (0.5 = useless; read it in either direction). \u201cWeight\u201d is the size of the column\'s standardised coefficient in the fitted model, averaged over the five folds.');

  const tcard = EVU.card(stage, 'AUC: offline and on the day'); const tab = EVU.table(tcard, ['Columns', 'Offline: random 5-fold', 'Offline: split by time', 'Live: same folds', 'Live: split by time'], [['', '', '', '', ''], ['', '', '', '', '']], { caption: 'AUC offline and live for the ticked columns and for the honest columns' });
  const tnote = UI.note(tcard, '', 'callout');

  const R = UI.plotCard(stage, 'ROC curves', { xlim: [0, 1], ylim: [0, 1], aspect: 1.35, margin: { l: 48, r: 14, t: 10, b: 42 }, label: 'ROC curves for the ticked columns and for the honest columns' }, ' ');
  const sg = UI.seg(R.card, { label: 'Score the model on', options: [{ value: 'offline', label: 'Offline table (random 5-fold)' }, { value: 'live', label: 'Live snapshot (same folds)' }], value: view, onChange(v) { view = v; R.plot.redraw(); } });
  R.card.insertBefore(sg.el, R.host);
  UI.legend(R.card, [{ label: 'ticked columns', color: UI.colors().c[0], shape: 'line' }, { label: 'honest columns only', color: UI.colors().c[1], shape: 'dash' }, { label: 'coin flip', color: UI.colors().muted, shape: 'dash' }]);
  const spot = EVU.card(stage, 'How to spot a leaky column');
  spot.append(h('ul', { class: 'note', style: { margin: 0, paddingLeft: '20px' }, html: '<li><b>One column is far better than the rest.</b> Real signals are usually modest; a single column with AUC near 0.9 deserves suspicion.</li><li><b>A leaky column can look modest.</b> refund_issued and days_since_last_login score only about 0.69 and 0.71 alone, yet the churn event writes them. Drop just the survey column and the model still scores about 0.87 offline against 0.71 live.</li><li><b>The column is created after the event.</b> A survey sent when someone cancels, a refund for the cancellation, a field refreshed at export time.</li><li><b>One standardised coefficient dwarfs the others</b> in the fitted model.</li><li><b>Ask: would I know this value at the moment I make the prediction?</b> If not, leave it out, whatever it does to the score.</li><li>Changing the split (random, by time) does not help: the leaky columns are filled in for the later months too.</li>' }));

  function build() {
    rows = ML.churnData(NR, ML.rng(seed * 4099 + 5)); y = rows.map((r) => r.churn); folds = ML.stratKFold(y, 5, ML.rng(seed + 11)); mine = null; honest = null;
    COLS.forEach((cl) => { const a = ML.auc(rows.map((r) => ({ tenure: r.tenure, monthly: r.monthly, calls: r.calls, m2m: r.m2m, drop: r.drop, survey: r.surveyPost, refund: r.refundPost, login: r.loginPost })[cl.id]), y); alone[cl.id] = Math.max(a, 1 - a); aloneEl[cl.id].textContent = alone[cl.id].toFixed(2); });
    evaluate(true);
  }
  function syncBoxes() { COLS.forEach((cl) => { boxes[cl.id].checked = sel.has(cl.id); }); }
  function* fitSet(ids, out, tick) {
    const Xo = ML.churnMatrix(rows, ids, false), Xl = ML.churnMatrix(rows, ids, true), offS = new Float64Array(NR), liveS = new Float64Array(NR), coef = new Float64Array(ids.length);
    const fit = (tr) => { const Xtr = tr.map((i) => Xo[i]), sc = ML.scaler(Xtr, true), lr = ML.logreg(sc.transform(Xtr), tr.map((i) => y[i]), { C: 1, maxIter: 40 }); return { sc, lr }; };
    for (let f = 0; f < folds.length; f++) {
      const { sc, lr } = fit(folds[f].train); for (const i of folds[f].test) { offS[i] = lr.decision(sc.apply(Xo[i])); liveS[i] = lr.decision(sc.apply(Xl[i])); } lr.w.forEach((w, j) => { coef[j] += Math.abs(w) / folds.length; }); tick(); yield;
    }
    const tr = [], te = []; rows.forEach((r, i) => (r.month <= 9 ? tr : te).push(i)); const { sc, lr } = fit(tr), yt = te.map((i) => y[i]);
    out.timeOff = ML.auc(te.map((i) => lr.decision(sc.apply(Xo[i]))), yt); out.timeLive = ML.auc(te.map((i) => lr.decision(sc.apply(Xl[i]))), yt); tick(); yield;
    out.off = ML.auc(offS, y); out.live = ML.auc(liveS, y); out.roc = { off: ML.rocCurve(offS, y), live: ML.rocCurve(liveS, y) }; out.coef = Object.fromEntries(ids.map((id, j) => [id, coef[j]])); out.ids = ids;
  }
  function evaluate(both) {
    if (job) job.stop(); const ids = COLS.map((q) => q.id).filter((id) => sel.has(id)), my = ++gen; mine = null; if (both) honest = null;
    const sets = [{ ids, key: 'mine' }]; if (!honest) sets.push({ ids: HONEST, key: 'honest' });
    if (!ids.length) { sets.shift(); }
    let done = 0; const total = sets.length * 6; const tick = () => { done++; pg.set(done / total); };
    function* all() { for (const s of sets) { const o = {}; yield* fitSet(s.ids, o, tick); if (my !== gen) return; if (s.key === 'mine') mine = o; else honest = o; refresh(); } }
    job = EVU.job(all(), { progress: pg, frame: () => {} }); refresh();
  }
  const f2 = (v) => (v == null ? '…' : v.toFixed(2));
  function refresh() {
    const cellFor = (o, key, base) => { if (!o) return '…'; const v = o[key]; return { text: v.toFixed(2), cls: base && o[base] - v > 0.1 ? 'bad' : '' }; };
    const nSel = sel.size;
    tab.set([[nSel ? 'Ticked columns (' + nSel + ')' : 'No column ticked', mine ? f2(mine.off) : nSel ? '…' : '–', mine ? f2(mine.timeOff) : nSel ? '…' : '–', mine ? cellFor(mine, 'live', 'off') : nSel ? '…' : '–', mine ? cellFor(mine, 'timeLive', 'timeOff') : nSel ? '…' : '–'],
      ['Honest columns only (5)', honest ? f2(honest.off) : '…', honest ? f2(honest.timeOff) : '…', honest ? f2(honest.live) : '…', honest ? f2(honest.timeLive) : '…']]);
    COLS.forEach((cl) => { const v = mine && mine.coef[cl.id]; coefEl[cl.id].style.width = v ? Math.min(70, 26 * v) + 'px' : '0'; coefEl[cl.id].title = v ? 'standardised coefficient ' + v.toFixed(2) : ''; });
    if (mine && honest) { const leak = COLS.some((cl) => !cl.known && sel.has(cl.id));
      tnote.innerHTML = leak ? 'Offline, both splits give about <b>' + f2(mine.off) + '</b>: the way you split cannot see the leak. On the day, the same model scores <b>' + f2(mine.live) + '</b>, ' + (mine.live < honest.live ? 'worse than the model that never saw the leaky columns (<b>' + f2(honest.live) + '</b>).' : 'about the same as the honest model (<b>' + f2(honest.live) + '</b>).') : 'No leaky column is ticked, so offline and live agree: about <b>' + f2(mine.off) + '</b> either way. That is the honest number for these columns.'; }
    else tnote.innerHTML = nSel ? 'Fitting…' : 'Tick at least one column.';
    R.cap.innerHTML = 'Each curve pools the held-out scores of the five folds. A curve hugging the top-left corner is a model that ranks churners first.'; R.plot.redraw();
  }
  R.plot.draw = (p) => {
    const col = p.col; p.axes({ xlabel: 'false positive rate (non-churners flagged)', ylabel: 'true positive rate (churners caught)', xfmt: (v) => +v.toFixed(1) + '', yfmt: (v) => +v.toFixed(1) + '' }); p.seg(0, 0, 1, 1, { color: col.muted, w: 1.6, dash: [5, 5] });
    const pick = (o) => (o ? (view === 'offline' ? o.roc.off : o.roc.live) : null), thin = (a) => (a.length > 700 ? a.filter((_, i) => i % Math.ceil(a.length / 700) === 0 || i === a.length - 1) : a);
    if (honest) p.line(thin(pick(honest)), { color: col.c[1], w: 2.4, dash: [8, 5] }); if (mine) p.line(thin(pick(mine)), { color: col.c[0], w: 3 });
    p.setLabel('ROC curves, ' + (view === 'offline' ? 'offline table' : 'live snapshot') + (mine ? ': ticked columns AUC ' + f2(view === 'offline' ? mine.off : mine.live) : ''));
    if (mine) p.text(0.97, 0.06, 'AUC ' + f2(view === 'offline' ? mine.off : mine.live) + ' (ticked)', { align: 'right', weight: 700, color: col.c[0], halo: true }); if (honest) p.text(0.97, 0.13, 'AUC ' + f2(view === 'offline' ? honest.off : honest.live) + ' (honest only)', { align: 'right', weight: 700, color: col.c[1], halo: true });
  };
  build();
})();
