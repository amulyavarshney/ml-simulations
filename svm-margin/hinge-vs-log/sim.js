/* Hinge loss against log-loss: the loss curves, and a linear SVM and logistic regression fitted to the same points. */
(function () {
  'use strict';
  const { stage, side } = UI.shell('svm-margin/hinge-vs-log');
  const h = UI.h;
  let preset = 'overlap', seed = 8, pts = SU.makePts(preset, seed), C = 1, m = 0.4, svm = null, lr = null, shift = null;

  const c = UI.panel(side, 'Loss at one point');
  UI.slider(c, { label: 'Margin m = y · f(x)', min: -2.5, max: 3, step: 0.01, value: m, fmt: (v) => v.toFixed(2), help: 'm &gt; 0: correct side. m &gt; 1: outside the street.', onInput(v) { m = v; readLoss(); L.plot.redraw(); } });
  const rl = UI.panel(side, 'At this margin'), RL = UI.read(rl, [{ id: 'h', label: 'Hinge loss  max(0, 1 − m)' }, { id: 'l', label: 'Log-loss  ln(1 + e^−m)' }, { id: 'z', label: '0–1 loss' }, { id: 'gh', label: 'Pull on the boundary, hinge' }, { id: 'gl', label: 'Pull on the boundary, log-loss' }]);
  const d = UI.panel(side, 'Data and penalty');
  const mode = SU.modeControl(d, 'blue', 'orange');
  UI.slider(d, { label: 'C (same for both models)', min: 0.01, max: 100, log: true, value: C, fmt: (v) => UI.sci(v), onInput(v) { C = v; shift = null; update(); } });
  UI.select(d, { label: 'Start from', options: SU.options(['overlap', 'blobs', 'outlier']), value: preset, onChange(v) { preset = v; pts = SU.makePts(v, seed); shift = null; update(); } });
  UI.buttons(d, [{ label: 'Add an easy point far away', primary: true, onClick() { addEasy(); } }, { label: 'New sample', onClick() { seed++; pts = SU.makePts(preset, seed); shift = null; update(); } }]);
  const rd = UI.panel(side, 'Readouts'), R = UI.read(rd, [{ id: 'ang', label: 'Angle between the two lines' }, { id: 'sv', label: 'Points that shape the SVM line' }, { id: 'sh1', label: 'Last easy point: SVM line moved' }, { id: 'sh2', label: 'Last easy point: logistic line moved' }]);

  const L = UI.plotCard(stage, 'Loss against margin', { xlim: [-2.5, 3], ylim: [0, 3.4], aspect: 2.2, margin: { l: 48, b: 42 }, hover: true, label: 'Hinge, logistic and zero-one loss against margin' }, 'Hinge reaches exactly zero at m = 1; the log-loss only approaches zero. Both rise linearly on the wrong side.');
  UI.legend(L.card, [{ label: 'hinge loss (SVM)', color: UI.colors().ink, shape: 'line' }, { label: 'log-loss (logistic regression)', color: UI.colors().c[2], shape: 'dash' }, { label: '0–1 loss', color: UI.colors().muted, shape: 'dash' }]);
  const ed = SU.editor(stage, { title: 'The same points, two fitted lines', xlim: [-3.2, 3.2], ylim: [-2.3, 2.3], aspect: 1.55, points: () => pts, mode: () => mode.get(), onChange(done) { if (done) shift = null; update(); }, draw });
  SU.legend(ed.card, 'class A', 'class B'); UI.legend(ed.card, [{ label: 'SVM line (solid) and street (dashed)', color: UI.colors().ink, shape: 'line' }, { label: 'logistic regression line', color: UI.colors().c[2], shape: 'dash' }]);

  const norm = (w, b) => { const n = Math.hypot(w[0], w[1]); return [w[0] / n, w[1] / n, b / n]; };
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  function fits() { const d2 = SU.XY(pts); svm = SU.fit(pts, { kernel: 'linear', C, maxMs: 300 }); lr = SU.hasBoth(pts) ? ML.logreg(d2.X, d2.y, { C }) : null; }
  function addEasy() {
    if (!svm || !lr) return; const before = [norm(svm.w, svm.b), norm(lr.w, lr.b)], w = svm.w, n = Math.hypot(w[0], w[1]), side1 = pts.filter((p) => p.c === 1), mx = ML.mean(side1.map((p) => p.x)), my = ML.mean(side1.map((p) => p.y));
    let x = mx + 1.8 * w[0] / n, y = my + 1.8 * w[1] / n; x = UI.clamp(x, -3.1, 3.1); y = UI.clamp(y, -2.2, 2.2);
    pts.push({ x, y, c: 1 }); fits(); shift = [dist(before[0], norm(svm.w, svm.b)), dist(before[1], norm(lr.w, lr.b))]; update(true);
  }
  function update() { fits(); readouts(); ed.plot.redraw(); }
  function readouts() {
    if (!svm || !lr) { ['ang', 'sv', 'sh1', 'sh2'].forEach((k) => R.set(k, '–')); return; }
    const a = Math.acos(UI.clamp(ML.dot(svm.w, lr.w) / (Math.hypot(...svm.w) * Math.hypot(...lr.w)), -1, 1)) * 180 / Math.PI; R.set('ang', UI.f(a, 1) + '°'); R.set('sv', svm.nSV + ' of ' + pts.length);
    R.set('sh1', shift ? shift[0].toFixed(4) : '–', shift && shift[0] < 1e-3 ? 'good' : ''); R.set('sh2', shift ? shift[1].toFixed(4) : '–');
  }
  const hinge = (x) => Math.max(0, 1 - x), logl = (x) => (x > 30 ? 0 : x < -30 ? -x : Math.log1p(Math.exp(-x)));
  function readLoss() { RL.set('h', UI.f(hinge(m), 3)); RL.set('l', UI.f(logl(m), 3)); RL.set('z', m < 0 ? '1' : '0'); RL.set('gh', m < 1 ? 'full (slope −1)' : 'none (0)', m >= 1 ? 'good' : ''); RL.set('gl', 'slope −' + UI.f(1 / (1 + Math.exp(m)), 3)); }
  function draw(p) {
    const col = p.col; if (svm) SU.drawModel(p, svm, { linear: true, sv: true });
    if (lr) p.abline(lr.w[0], lr.w[1], lr.b, { color: col.c[2], w: 2.6, dash: [8, 5] });
    SU.drawPoints(p, pts); p.setLabel('Two classes with a linear SVM line and a logistic regression line');
  }
  L.plot.draw = (p) => {
    const col = p.col; p.axes({ xlabel: 'margin m = y · f(x)', ylabel: 'loss', zero: true });
    const hs = [], ls = []; for (let x = -2.5; x <= 3.001; x += 0.02) { hs.push([x, hinge(x)]); ls.push([x, logl(x)]); }
    p.seg(-2.5, 1, 0, 1, { color: col.muted, w: 2, dash: [3, 4] }); p.seg(0, 0, 3, 0, { color: col.muted, w: 2, dash: [3, 4] }); p.seg(0, 0, 0, 1, { color: col.muted, w: 1.2, dash: [3, 4] });
    p.line(ls, { color: col.c[2], w: 3, dash: [8, 5] }); p.line(hs, { color: col.ink, w: 3 });
    p.seg(m, 0, m, 3.4, { color: col.accent, w: 1.2, dash: [3, 3] }); p.dot(m, hinge(m), { fill: col.ink, r: 6 }); p.dot(m, logl(m), { fill: col.c[2], r: 5.5, shape: 'square' });
    p.text(1, 0.18, 'm = 1', { color: col.ink2, align: 'center', weight: 600, size: 12 });
  };
  L.plot.on('hover', (e) => { if (e.x < -2.5 || e.x > 3) return UI.tip.hide(); UI.tip.show('m = ' + UI.f(e.x, 2) + '<br>hinge ' + UI.f(hinge(e.x), 2) + '<br>log-loss ' + UI.f(logl(e.x), 2), e.cx, e.cy); });
  readLoss(); update();
})();
