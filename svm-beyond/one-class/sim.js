/* One-class SVM: boundary around normal data, nu bounds, gamma shape, probe scoring. */
(function () {
  'use strict';
  const { stage, side } = UI.shell('svm-beyond/one-class');
  const h = UI.h;
  const PRE = {
    cloud: { label: 'One cloud', make: (r) => Array.from({ length: 120 }, () => ({ x: 0.8 * r.normal(), y: 0.7 * r.normal(), c: 0 })) },
    two: { label: 'Two clusters', make: (r) => Array.from({ length: 60 }, () => ({ x: -1.5 + 0.5 * r.normal(), y: -0.7 + 0.5 * r.normal(), c: 0 })).concat(Array.from({ length: 60 }, () => ({ x: 1.5 + 0.5 * r.normal(), y: 0.8 + 0.5 * r.normal(), c: 0 }))) },
    banana: { label: 'Curved band', make: (r) => Array.from({ length: 120 }, () => { const t = -1.2 + 2.4 * r(); return { x: 2.2 * t + 0.15 * r.normal(), y: 1.1 * t * t - 0.7 + 0.15 * r.normal(), c: 0 }; }) },
  };
  let preset = 'cloud', seed = 6, pts = PRE[preset].make(ML.rng(seed)), nu = 0.1, gamma = 0.5, model = null, probe = null, dragging = false;
  const TOL = 1e-3;

  const c = UI.panel(side, 'Data');
  const mode = UI.seg(c, { label: 'Click on the plot to…', options: [{ value: 'A', label: 'add' }, { value: 'X', label: 'remove' }, { value: 'P', label: 'probe' }], value: 'A', help: 'Dragging any point always moves it.' });
  UI.select(c, { label: 'Normal data', options: Object.keys(PRE).map((k) => ({ value: k, label: PRE[k].label })), value: preset, onChange(v) { preset = v; pts = PRE[v].make(ML.rng(seed)); probe = null; update(); } });
  UI.buttons(c, [{ label: 'Add 3 far outliers', onClick() { [[2.6, 1.8], [-2.8, 1.6], [0.4, -2.1]].forEach((q) => pts.push({ x: q[0], y: q[1], c: 0 })); update(); } }, { label: 'New sample', onClick() { seed++; pts = PRE[preset].make(ML.rng(seed)); update(); } }]);
  const k = UI.panel(side, 'One-class SVM');
  UI.slider(k, { label: 'ν (nu)', min: 0.01, max: 0.5, step: 0.01, value: nu, fmt: (v) => v.toFixed(2), onInput(v) { nu = v; update(); } });
  UI.slider(k, { label: 'γ (gamma)', min: 0.01, max: 50, log: true, value: gamma, fmt: (v) => UI.sci(v), onInput(v) { gamma = v; update(); } });
  const rd = UI.panel(side, 'Readouts'), R = UI.read(rd, [{ id: 'out', label: 'Training points clearly outside' }, { id: 'nu', label: 'ν' }, { id: 'sv', label: 'Support vectors' }, { id: 'chk', label: 'outside ≤ ν ≤ support vectors?' }, { id: 'pr', label: 'Probe score' }]);
  UI.note(rd, 'Outside = score below −0.001. Points exactly on the boundary (free support vectors) count as support vectors, not as outside.');

  const ed = SU.editor(stage, { title: 'Where does the normal data live?', xlim: [-3.4, 3.4], ylim: [-2.5, 2.5], aspect: 1.5, points: () => pts, mode: () => mode.get(), onProbe(x, y) { probe = [x, y]; dragging = true; probeR(); ed.plot.redraw(); }, onChange(done) { dragging = !done; update(); }, draw, cap: 'Solid line: the boundary (score 0). Orange triangles: training points clearly outside. Rings: support vectors.' });
  UI.legend(ed.card, [{ label: 'inside or on the boundary', color: UI.colors().c[0], shape: 'circle' }, { label: 'clearly outside', color: UI.colors().c[1], shape: 'triangle' }]);

  function probeR() { if (!probe || !model) { R.set('pr', 'use the probe'); return; } const s = model.decision(probe); R.set('pr', UI.f(s, 3) + (s < -TOL ? ' → unusual' : ' → normal'), s < -TOL ? 'warn' : 'good'); }
  function update() {
    if (pts.length < 10) { model = null; ed.plot.redraw(); return; }
    model = ML.oneClass(pts.map((q) => [q.x, q.y]), { gamma, nu, tol: 1e-4, maxMs: 300 }); const n = pts.length, out = pts.filter((q) => model.decision([q.x, q.y]) < -TOL).length, svShare = model.nSV / n, slack = 1 / n + 1e-9;
    R.set('out', out + ' of ' + n + ' (' + UI.pct(out / n, 1) + ')'); R.set('nu', UI.pct(nu, 1)); R.set('sv', model.nSV + ' of ' + n + ' (' + UI.pct(svShare, 1) + ')'); const ok = out / n <= nu + slack && svShare >= nu - slack; R.set('chk', ok ? 'yes, both hold' : 'no', ok ? 'good' : 'warn'); probeR(); ed.plot.redraw();
  }
  function draw(p) {
    const col = p.col; if (model) {
      const f = p.field((x, y) => model.decision([x, y]), dragging ? 44 : 76, dragging ? 32 : 54), c0 = UI.rgb(col.c[0]), c1 = UI.rgb(col.c[1]);
      p.heat(f, (v) => (v >= 0 ? [c0[0], c0[1], c0[2], Math.round(255 * Math.min(0.28, 0.04 + 0.12 * Math.min(v, 1.5)))] : [c1[0], c1[1], c1[2], Math.round(255 * Math.min(0.22, 0.04 + 0.1 * Math.min(-v, 1.5)))])); p.contour(f, 0, { color: col.ink, w: 2.8 });
    }
    pts.forEach((q) => { const out = model && model.decision([q.x, q.y]) < -TOL, st = out ? UI.cls(1) : UI.cls(0); p.dot(q.x, q.y, { fill: st.color, shape: st.shape, r: 4.8, lw: 1.4 }); });
    if (model) model.svIdx.forEach((i) => p.ring(pts[i].x, pts[i].y, 9, { color: col.ink, w: 1.2, dash: null }));
    if (probe) { p.dot(probe[0], probe[1], { fill: col.ink, shape: 'star', r: 8, lw: 1.5 }); }
    p.setLabel('One-class SVM boundary around ' + pts.length + ' points with nu ' + nu.toFixed(2));
  }
  update();
})();
