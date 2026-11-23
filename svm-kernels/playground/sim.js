/* Kernel playground: draw data, choose a kernel, tune C and gamma, probe the weighted vote of support vectors. */
(function () {
  'use strict';
  const { stage, side } = UI.shell('svm-kernels/playground');
  const h = UI.h;
  let preset = 'moons', seed = 3, pts = SU.makePts(preset, seed), kernel = 'rbf', C = 1, gamma = 1, degree = 3, coef0 = 1, model = null, probe = null, cvAcc = null, dragging = false;
  const gs = () => (pts.length > 2 ? ML.gammaScale(pts.map((p) => [p.x, p.y])) : 1);

  const c = UI.panel(side, 'Data');
  const mode = SU.modeControl(c, 'blue', 'orange', true);
  UI.select(c, { label: 'Start from', options: SU.options(['moons', 'circles', 'xor', 'spiral', 'overlap', 'blobs']), value: preset, onChange(v) { preset = v; pts = SU.makePts(v, seed); probe = null; gamma = gs(); gS.set(gamma); update(true); } });
  UI.buttons(c, [{ label: 'New sample', onClick() { seed++; pts = SU.makePts(preset, seed); update(true); } }, { label: 'Clear', onClick() { pts = []; probe = null; update(true); } }]);
  const k = UI.panel(side, 'Kernel');
  UI.seg(k, { label: 'Kernel', options: [{ value: 'linear', label: 'Linear' }, { value: 'poly', label: 'Polynomial' }, { value: 'rbf', label: 'RBF' }], value: kernel, onChange(v) { kernel = v; vis(); update(true); } });
  UI.slider(k, { label: 'C', min: 0.01, max: 1000, log: true, value: C, fmt: (v) => UI.sci(v), onInput(v) { C = v; update(true); } });
  const gS = UI.slider(k, { label: 'γ (gamma)', min: 0.01, max: 1000, log: true, value: gamma, fmt: (v) => UI.sci(v), onInput(v) { gamma = v; update(true); } });
  const gBtn = UI.buttons(k, [{ id: 'sc', label: 'γ = “scale”', title: '1 / (n_features × variance of X), scikit-learn\'s default', onClick() { gamma = gs(); gS.set(gamma); update(true); } }]);
  const dS = UI.slider(k, { label: 'Degree', min: 2, max: 6, step: 1, value: degree, fmt: (v) => String(Math.round(v)), onInput(v) { degree = Math.round(v); update(true); } });
  const rS = UI.slider(k, { label: 'Offset r (coef0)', min: 0, max: 3, step: 0.1, value: coef0, fmt: (v) => v.toFixed(1), onInput(v) { coef0 = v; update(true); } });
  function vis() { gS.el.style.display = kernel === 'linear' ? 'none' : ''; gBtn.sc.parentNode.style.display = kernel === 'linear' ? 'none' : ''; dS.el.style.display = rS.el.style.display = kernel === 'poly' ? '' : 'none'; }
  const rd = UI.panel(side, 'Readouts'), R = UI.read(rd, [{ id: 'sv', label: 'Support vectors' }, { id: 'tr', label: 'Training accuracy' }, { id: 'cv', label: '5-fold cross-validated accuracy' }, { id: 'gs', label: 'γ = “scale” would be' }]);

  const ed = SU.editor(stage, { title: 'Decision surface', xlim: [-3.2, 3.2], ylim: [-2.3, 2.3], aspect: 1.5, points: () => pts, mode: () => mode.get(), onProbe(x, y) { probe = [x, y]; dragging = true; paintVote(); ed.plot.redraw(); }, onChange(done) { dragging = !done; update(done); }, draw, cap: 'Solid line: boundary. Dashed lines: the street. Rings: support vectors. In probe mode, circles around the support vectors show their votes at the star (size ∝ vote; blue = class A, orange = class B).' });
  SU.legend(ed.card, 'class A', 'class B');
  const vote = h('section', { class: 'card panel' }, h('h3', { text: 'Vote inspector' })), vb = h('div'); vote.append(vb); stage.append(vote);

  const opts = () => ({ kernel, C, gamma, degree, coef0, maxMs: 300 });
  function update(full) {
    vis(); model = SU.fit(pts, opts());
    R.set('gs', UI.sci(gs()));
    if (model) { R.set('sv', model.nSV + ' of ' + pts.length); R.set('tr', UI.pct(SU.accuracy(model, pts), 0)); if (full) { cvAcc = SU.cv(pts, opts(), 5, 7); R.set('cv', cvAcc == null ? '–' : UI.pct(cvAcc, 0)); } else R.set('cv', cvAcc == null ? '–' : UI.pct(cvAcc, 0) + ' (old: updates when you let go)', 'warn'); } else { R.set('sv', '–'); R.set('tr', '–'); R.set('cv', '–'); }
    paintVote(); ed.plot.redraw();
  }
  function paintVote() {
    vb.textContent = '';
    if (!model) { vb.append(h('p', { class: 'note', text: 'Add points of both classes.' })); return; }
    if (!probe) { vb.append(h('p', { class: 'note', html: 'Choose <b>probe</b> under “Click on the plot to…”, then click or drag on the plot. Each support vector i votes α<sub>i</sub>·y<sub>i</sub>·K(x<sub>i</sub>, probe); the score is the sum of the votes plus the offset b.' })); return; }
    const kfn = model.kfn, rows = model.svIdx.map((i, j) => { const kv = kfn(model.SV[j], probe); return { i, kv, w: model.coef[j], v: model.coef[j] * kv, x: model.SV[j] }; }), sum = rows.reduce((s, q) => s + q.v, 0), score = sum - model.rho;
    const sk = rows.reduce((s, q) => s + q.kv, 0), sk2 = rows.reduce((s, q) => s + q.kv * q.kv, 0), eff = sk2 > 0 ? sk * sk / sk2 : 0, abs = rows.reduce((s, q) => s + Math.abs(q.v), 0);
    rows.sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
    const bDecides = kernel === 'rbf' && Math.abs(sum) < Math.abs(model.rho);
    vb.append(h('p', { html: 'Probe at (' + UI.f(probe[0], 2) + ', ' + UI.f(probe[1], 2) + '): votes sum to <b>' + UI.f(sum, 3) + '</b>, offset b = <b>' + UI.f(-model.rho, 3) + '</b>, score f = <b>' + UI.f(score, 3) + '</b> → <b style="color:' + (score >= 0 ? 'var(--c2)' : 'var(--c1)') + '">' + (score >= 0 ? 'class B (orange)' : 'class A (blue)') + '</b>' + (kernel === 'rbf' ? '<br>Effective voters (ΣK)² ∕ ΣK²: <b>' + UI.f(eff, 1) + '</b> of ' + rows.length + ' support vectors.' + (bDecides ? ' <b style="color:var(--warn)">The offset outweighs the vote here: b decides.</b>' : '') : '') }));
    vb.append(h('table', { class: 't' }, h('thead', null, h('tr', null, ['support vector at', 'α·y', 'K(sv, probe)', 'vote'].map((t) => h('th', { text: t })))), h('tbody', null, rows.slice(0, 6).map((q) => h('tr', null, h('td', { text: '(' + UI.f(q.x[0], 2) + ', ' + UI.f(q.x[1], 2) + ')' }), h('td', { text: UI.f(q.w, 2) }), h('td', { text: UI.f(q.kv, 4) }), h('td', { text: UI.f(q.v, 3) })))), rows.length > 6 ? h('tfoot', null, h('tr', null, h('td', { colSpan: 4, class: 'note', text: '… and ' + (rows.length - 6) + ' smaller votes' }))) : null));
  }
  function draw(p) {
    const col = p.col; if (model) SU.drawModel(p, model, { nx: dragging ? 44 : 70, ny: dragging ? 32 : 50 });
    if (probe && model) {
      const kfn = model.kfn, mx = Math.max(1e-9, ...model.svIdx.map((i, j) => Math.abs(model.coef[j] * kfn(model.SV[j], probe))));
      model.svIdx.forEach((i, j) => { const v = model.coef[j] * kfn(model.SV[j], probe), q = pts[i], r = 6 + 22 * Math.sqrt(Math.abs(v) / mx); if (Math.abs(v) / mx > 0.02) { p.ring(q.x, q.y, r, { color: v > 0 ? col.c[1] : col.c[0], w: 2.4 }); } });
      p.dot(probe[0], probe[1], { fill: col.ink, shape: 'star', r: 8, lw: 1.5 });
    }
    SU.drawPoints(p, pts, { r: 4.8 }); p.setLabel('Decision surface of a ' + kernel + ' kernel SVM on ' + pts.length + ' points');
  }
  gamma = gs(); gS.set(gamma); update(true);
})();
