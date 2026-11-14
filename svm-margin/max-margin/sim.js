/* Hard-margin SVM in two features: widest street, support vectors, deletion test, other separating lines. */
(function () {
  'use strict';
  const { stage, side } = UI.shell('svm-margin/max-margin');
  const h = UI.h;
  let preset = 'blobs', seed = 3, pts = SU.makePts(preset, seed), model = null, lines = [], showLines = true, sepOK = true, delInfo = null, linesKey = '';
  const rng = ML.rng(99);

  const c = UI.panel(side, 'Data');
  const mode = SU.modeControl(c, 'blue', 'orange');
  const ps = UI.select(c, { label: 'Start from', options: SU.options(['blobs', 'outlier', 'overlap']), value: preset, onChange(v) { preset = v; pts = SU.makePts(preset, seed); update(); } });
  UI.buttons(c, [{ label: 'New sample', onClick() { seed++; pts = SU.makePts(preset, seed); update(); } }, { label: 'Clear', onClick() { pts = []; update(); } }]);
  UI.check(c, { label: 'Show other separating lines', value: true, onChange(v) { showLines = v; ed.plot.redraw(); } });
  const rd = UI.panel(side, 'Readouts'), R = UI.read(rd, [{ id: 'sep', label: 'Separable?' }, { id: 'w', label: 'w' }, { id: 'b', label: 'b' }, { id: 'width', label: 'Street width 2/‖w‖' }, { id: 'sv', label: 'Support vectors' }, { id: 'dn', label: 'Delete a non-support point: change in line' }, { id: 'ds', label: 'Delete a support vector: change in line' }]);

  const ed = SU.editor(stage, { title: 'Two features, two classes', xlim: [-3.2, 3.2], ylim: [-2.3, 2.3], aspect: 1.5, points: () => pts, mode: () => mode.get(), onChange(done) { if (done) preset = 'custom'; update(done); }, draw, cap: 'Solid line: maximum-margin boundary. Dashed lines: the street\'s edges. Rings: support vectors. Faint grey lines: other lines that also separate the data.', tip: (i) => 'point ' + (i + 1) + ': (' + UI.f(pts[i].x, 2) + ', ' + UI.f(pts[i].y, 2) + ')' });
  SU.legend(ed.card, 'class A', 'class B');

  function separating() { // sample lines that separate the current points
    const out = [], r = rng; if (!SU.hasBoth(pts)) return out; let tries = 0;
    while (out.length < 40 && tries++ < 4000) { const th = Math.PI * r(), u = [Math.cos(th), Math.sin(th)], a = [], b = []; pts.forEach((q) => (q.c ? b : a).push(q.x * u[0] + q.y * u[1])); const maxA = Math.max(...a), minB = Math.min(...b), maxB = Math.max(...b), minA = Math.min(...a); if (maxA < minB) out.push({ u, off: maxA + (minB - maxA) * r() }); else if (maxB < minA) out.push({ u, off: maxB + (minA - maxB) * r() }); }
    return out;
  }
  const fitHard = (arr) => SU.fit(arr, { kernel: 'linear', C: 1e4, tol: 1e-6, maxMs: 400 });
  const diff = (m1, m2) => { const n1 = Math.hypot(...m1.w), n2 = Math.hypot(...m2.w), a1 = [m1.w[0] / n1, m1.w[1] / n1, m1.b / n1], a2 = [m2.w[0] / n2, m2.w[1] / n2, m2.b / n2]; return Math.hypot(a1[0] - a2[0], a1[1] - a2[1], a1[2] - a2[2]); };
  function update(full) {
    model = fitHard(pts); sepOK = !!model && SU.slack(model, pts).every((s) => s < 1e-3) && SU.accuracy(model, pts) === 1;
    if (full !== false || !lines.length) { lines = sepOK ? separating() : []; }
    if (!model) { ['sep', 'w', 'b', 'width', 'sv', 'dn', 'ds'].forEach((k) => R.set(k, '–')); R.set('sep', 'need both classes'); ed.plot.redraw(); return; }
    R.set('sep', sepOK ? 'yes' : 'no: the groups overlap', sepOK ? 'good' : 'warn');
    if (sepOK) {
      const nw = Math.hypot(...model.w); R.set('w', '(' + UI.f(model.w[0], 2) + ', ' + UI.f(model.w[1], 2) + ')'); R.set('b', UI.f(model.b, 2)); R.set('width', UI.f(2 / nw, 3)); R.set('sv', model.nSV + ' of ' + pts.length);
      if (full !== false && pts.length <= 80) { const svSet = new Set(model.svIdx), non = [], sv = []; pts.forEach((_, i) => { const rest = pts.filter((__, j) => j !== i); if (!SU.hasBoth(rest)) return; const m2 = fitHard(rest); if (!m2) return; (svSet.has(i) ? sv : non).push(diff(model, m2)); }); delInfo = { non: non.length ? Math.max(...non) : null, sv: sv.length ? sv.sort((a, b) => a - b)[Math.floor(sv.length / 2)] : null }; }
      R.set('dn', delInfo && delInfo.non != null ? 'max ' + delInfo.non.toExponential(1) : '–', 'good'); R.set('ds', delInfo && delInfo.sv != null ? 'median ' + UI.f(delInfo.sv, 3) : '–');
    } else { ['w', 'b', 'width', 'sv', 'dn', 'ds'].forEach((k) => R.set(k, '–')); }
    ed.plot.redraw();
  }
  function draw(p) {
    const col = p.col;
    if (showLines && sepOK) lines.forEach((l) => p.abline(l.u[0], l.u[1], -l.off, { color: col.ink2, w: 1, alpha: 0.28 }));
    if (model && sepOK) SU.drawModel(p, model, { linear: true });
    SU.drawPoints(p, pts); p.setLabel('Two classes of points with the maximum-margin line' + (model && sepOK ? '; street width ' + (2 / Math.hypot(...model.w)).toFixed(2) : ''));
  }
  update(true);
})();
