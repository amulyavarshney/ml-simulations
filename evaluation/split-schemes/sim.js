/* Choose the folds that match the data: K-fold, stratified, group and time-series splits drawn as row strips, with what each one gets wrong. */
(function () {
  'use strict';
  const { stage, side } = UI.shell('evaluation/split-schemes');
  const h = UI.h, N = 60, K = 5;
  const TYPES = {
    iid: { label: 'Balanced, independent rows', fit: 'strat', why: 'Rows do not depend on each other and the classes are balanced, so every scheme is valid. Stratified K-fold is the safe default: it keeps every test fold at the overall class share (the table shows plain K-fold drifting from it), and it costs nothing.' },
    imbalanced: { label: 'Rare positive class (about 1 row in 8)', fit: 'strat', why: 'With few positives, plain shuffled folds can leave a fold with almost none, so its score says little about the rare class. Stratified K-fold gives every fold its fair share.' },
    customers: { label: 'Customers with several rows each', fit: 'group', why: 'A customer\'s rows look alike, so a model can recognise a customer it has seen. Group K-fold keeps all of a customer\'s rows on one side, so the test fold holds only customers the model has never met.' },
    time: { label: 'Rows in time order', fit: 'ts', why: 'The model will be used on the future, so it must be scored on the future. The time-series split always trains on earlier rows and tests on the next block; shuffled folds let the model peek at later rows.' },
  };
  const SCHEMES = [
    { id: 'kfold', title: 'K-fold (shuffled)', cap: 'Shuffle the rows, cut them into 5 equal parts, hold out each part once. It ignores classes, groups and time.' },
    { id: 'strat', title: 'Stratified K-fold (shuffled)', cap: 'Like K-fold, but every part keeps the same share of each class. It ignores groups and time.' },
    { id: 'group', title: 'Group K-fold', cap: 'All rows of a group stay together, so a group is never on both sides. It ignores class share and time.' },
    { id: 'ts', title: 'Time-series split (forward chaining)', cap: 'Each test block is later than everything it is trained on. Grey rows are not used in that fold. The earliest rows are never tested.' },
  ];
  let type = 'customers', seed = 3, d = null, folds = {}, diag = {};

  const c = UI.panel(side, 'Data');
  UI.select(c, { label: 'What kind of data is it?', options: Object.keys(TYPES).map((k) => ({ value: k, label: TYPES[k].label })), value: type, onChange(v) { type = v; build(); } });
  UI.buttons(c, [{ label: 'New rows and new shuffle', onClick() { seed++; build(); } }]);
  UI.note(c, N + ' rows, 5 folds. The strips show every row of the file, in file order, as a thin cell.');
  const rec = h('p', { class: 'note callout', role: 'status' }); const rp = UI.panel(side, 'Which scheme fits?'); rp.append(rec);

  const Hd = UI.plotCard(stage, 'The rows, in file order', { xlim: [0, N], ylim: [0, 3], aspect: 4.6, margin: { l: 70, r: 10, t: 8, b: 8 }, hover: true, label: 'Strips showing the class, group and position of each row' }, 'Hover a cell to read the row. Orange = positive class.');
  const cards = {}; SCHEMES.forEach((s) => { cards[s.id] = UI.plotCard(stage, s.title, { xlim: [0, N], ylim: [0, K], aspect: 3.9, aspectFn: (w) => (w < 520 ? 2.4 : 3.9), margin: { l: 70, r: 10, t: 8, b: 8 }, hover: true, label: s.title + ': which rows are used for training and testing in each fold' }, s.cap); });
  UI.legend(cards.ts.card, [{ label: 'train', color: UI.colors().c[0], shape: 'line' }, { label: 'test', color: UI.colors().c[1], shape: 'square' }, { label: 'not used in this fold', color: UI.colors().axis, shape: 'dash' }]);
  const T = EVU.card(stage, 'What each scheme gets wrong on this data'); const tab = EVU.table(T, ['Scheme', 'Share of positives in each test fold', 'Groups on both sides, per fold', 'Test rows earlier than a training row, per fold'], [['', '', '', ''], ['', '', '', ''], ['', '', '', ''], ['', '', '', '']], { caption: 'What each fold scheme gets wrong' });
  const tnote = UI.note(T, '', 'callout');

  function build() {
    const r = ML.rng(seed * 101 + 7); let y = [], g = [], hasGroups = false;
    if (type === 'customers') {
      const sizes = [9, 8, 7, 7, 6, 5, 5, 4, 3, 3, 2, 1], lab = sizes.map((_, i) => (i % 2 === 0 ? 0 : 1)); r.shuffle(lab); const rows = []; sizes.forEach((s, k) => { for (let q = 0; q < s; q++) rows.push(k); }); r.shuffle(rows);
      g = rows; y = rows.map((k) => lab[k]); hasGroups = true;
    } else {
      const npos = type === 'imbalanced' ? 7 : 30; y = Array.from({ length: N }, (_, i) => (i < npos ? 1 : 0)); r.shuffle(y); g = y.map((_, i) => i);
    }
    d = { y, g, hasGroups, hasTime: type === 'time' };
    folds = { kfold: ML.kFold(N, K, ML.rng(seed * 13 + 1)), strat: ML.stratKFold(y, K, ML.rng(seed * 13 + 2)), group: ML.groupKFold(g, K), ts: ML.timeSeriesSplit(N, K) };
    SCHEMES.forEach((s) => { diag[s.id] = ML.foldDiagnostics(folds[s.id], { y, groups: g }); });
    refresh();
  }
  const pcs = (a) => a.map((v) => Math.round(v * 100) + '%').join(' · ');
  function refresh() {
    const prev = d.y.reduce((a, b) => a + b, 0) / N, T0 = TYPES[type]; rec.innerHTML = '<b>' + SCHEMES.find((s) => s.id === T0.fit).title + '.</b> ' + T0.why;
    const rows = SCHEMES.map((s) => {
      const dg = diag[s.id], sh = dg.map((q) => q.posShare), spread = Math.max(...sh) - Math.min(...sh), none = sh.some((v) => v === 0);
      const cls = { text: pcs(sh) + (none ? ' (a fold has none)' : spread > 0.2 ? ' (uneven)' : ' (even)'), cls: none ? 'bad' : spread > 0.2 ? 'warn' : 'good' };
      const gb = dg.map((q) => q.groupsBoth), grp = d.hasGroups ? { text: gb.join(' · ') + (gb.every((v) => v === 0) ? ' (none: good)' : ' (leak)'), cls: gb.every((v) => v === 0) ? 'good' : 'bad' } : { text: 'no groups in this data' };
      const er = dg.map((q) => q.earlier), tm = d.hasTime ? { text: er.join(' · ') + (er.every((v) => v === 0) ? ' (none: good)' : ' (peeks at the future)'), cls: er.every((v) => v === 0) ? 'good' : 'bad' } : { text: 'order does not matter here' };
      return [s.title + (T0.fit === s.id ? '  ← fits' : ''), cls, grp, tm];
    });
    tab.set(rows); tnote.innerHTML = 'Overall, <b>' + Math.round(prev * 100) + '%</b> of the rows are positive' + (d.hasGroups ? ' and there are <b>12 customers</b> (1 to 9 rows each), each with one label, so group folds cannot be balanced by class' : '') + '. In a good scheme every test fold is near that share' + (d.hasGroups ? ', no customer sits on both sides' : '') + (d.hasTime ? ' and no test row is earlier than a training row' : '') + '.';
    Hd.plot.redraw(); SCHEMES.forEach((s) => { cards[s.id].plot.redraw(); cards[s.id].card.querySelector('h3').textContent = s.title + (T0.fit === s.id ? '  ← fits this data' : ''); });
  }
  const cw = (p) => p.pw / N;
  Hd.plot.draw = (p, ctx) => {
    if (!d) return; const col = p.col, w = cw(p), rowH = p.ph / 3;
    const labels = ['Class', 'Group', 'Position'];
    labels.forEach((t, k) => p.text(8, p.m.t + rowH * (k + 0.5), t, { px: true, weight: 600, size: 12.5, base: 'middle' }));
    for (let i = 0; i < N; i++) {
      const x = p.m.l + i * w;
      ctx.fillStyle = d.y[i] ? col.c[1] : col.grid; ctx.fillRect(x, p.m.t + 3, Math.max(1, w - 1), rowH - 6);
      if (d.hasGroups) { ctx.fillStyle = col.c[d.g[i] % 8]; ctx.globalAlpha = 0.35 + 0.65 * ((Math.floor(d.g[i] / 8) % 2) ? 0.55 : 1); ctx.fillRect(x, p.m.t + rowH + 3, Math.max(1, w - 1), rowH - 6); ctx.globalAlpha = 1; }
      ctx.fillStyle = EVU.ramp(i / (N - 1)); ctx.fillRect(x, p.m.t + 2 * rowH + 3, Math.max(1, w - 1), rowH - 6);
    }
    if (!d.hasGroups) p.text(p.m.l + 6, p.m.t + rowH * 1.5, 'no groups: each row stands alone', { px: true, color: col.muted, size: 12 });
    p.setLabel('Rows of the data in file order: ' + d.y.reduce((a, b) => a + b, 0) + ' positive rows of ' + N + (d.hasGroups ? ', 12 customers' : ''));
  };
  Hd.plot.on('hover', (e) => { const i = Math.floor((e.px - Hd.plot.m.l) / cw(Hd.plot)); if (!d || i < 0 || i >= N) return UI.tip.hide(); UI.tip.show('<b>Row ' + (i + 1) + '</b> of ' + N + '<br>class: ' + (d.y[i] ? 'positive' : 'negative') + (d.hasGroups ? '<br>customer ' + (d.g[i] + 1) : ''), e.cx, e.cy); });
  SCHEMES.forEach((s) => {
    const P = cards[s.id].plot;
    P.draw = (p, ctx) => {
      if (!d) return; const col = p.col, w = cw(p), rowH = p.ph / K, sp = folds[s.id];
      sp.forEach((f, k) => {
        const y0 = p.m.t + rowH * k, role = new Uint8Array(N); f.train.forEach((i) => { role[i] = 1; }); f.test.forEach((i) => { role[i] = 2; });
        p.text(8, y0 + rowH / 2, 'Fold ' + (k + 1), { px: true, weight: 600, size: 12.5 });
        for (let i = 0; i < N; i++) {
          const x = p.m.l + i * w, cwid = Math.max(1, w - 1);
          if (role[i] === 2) { ctx.fillStyle = col.c[1]; ctx.fillRect(x, y0 + rowH * 0.08, cwid, rowH * 0.84); }
          else if (role[i] === 1) { ctx.fillStyle = col.c[0]; ctx.fillRect(x, y0 + rowH * 0.3, cwid, rowH * 0.4); }
          else { ctx.fillStyle = col.axis; ctx.fillRect(x, y0 + rowH * 0.46, cwid, rowH * 0.08); }
        }
      });
      p.setLabel(s.title + ': ' + K + ' folds; test rows per fold ' + sp.map((f) => f.test.length).join(', '));
    };
    P.on('hover', (e) => { const i = Math.floor((e.px - P.m.l) / cw(P)), k = Math.floor((e.py - P.m.t) / (P.ph / K)); if (!d || i < 0 || i >= N || k < 0 || k >= K) return UI.tip.hide(); const f = folds[s.id][k], role = f.test.includes(i) ? 'is tested' : f.train.includes(i) ? 'trains the model' : 'is not used'; UI.tip.show('<b>Row ' + (i + 1) + '</b> in fold ' + (k + 1) + ': ' + role + (d.hasGroups ? '<br>customer ' + (d.g[i] + 1) : ''), e.cx, e.cy); });
  });
  build();
})();
