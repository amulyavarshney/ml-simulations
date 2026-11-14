/* Lift a number line into a plane: (z, z^2), the linear SVM there, and the thresholds it implies back on the line. */
(function () {
  'use strict';
  const { stage, side } = UI.shell('svm-kernels/lift');
  const h = UI.h;
  const base = () => [-0.55, -0.35, -0.15, 0.05, 0.25, 0.5].map((x) => ({ x, c: 0 })).concat([-2.0, -1.55, -1.25, 1.2, 1.6, 2.05].map((x) => ({ x, c: 1 })));
  let pts = base(), lift = 1, map = 'zz2', model = null, sepOK = true;

  UI.predict(side, { title: 'Predict first', q: 'A reading z = 2 is lifted by z → (z, z²). Where does it land in the plane?', options: ['(2, 2)', '(2, 4)', '(4, 2)', '(2, −4)'], answer: 1, reveal: '(2, 4): the first coordinate stays z and the second is z² = 4. The lifted point sits on the parabola y = x².' });
  const c = UI.panel(side, 'The lift');
  UI.seg(c, { label: 'Map', options: [{ value: 'zz2', label: '(z, z²)' }, { value: 'z2', label: 'z² only' }, { value: 'z', label: 'z only' }], value: map, onChange(v) { map = v; update(); } });
  const lS = UI.slider(c, { label: 'Lift amount (picture only)', min: 0, max: 1, step: 0.01, value: lift, fmt: (v) => v.toFixed(2), help: 'Slides the second coordinate from 0 up to z². The SVM always uses the full lift.', onInput(v) { lift = v; B.plot.redraw(); } });
  UI.buttons(c, [{ label: 'Animate the lift', onClick() { let t0 = performance.now(); const f = (now) => { const t = Math.min(1, (now - t0) / 1600); lift = t; lS.set(t); B.plot.redraw(); if (t < 1) requestAnimationFrame(f); }; lift = 0; lS.set(0); requestAnimationFrame(f); } }, { label: 'Reset readings', onClick() { pts = base(); update(); } }]);
  UI.note(c, 'Drag a reading sideways on the number line. Blue = healthy, orange = failing.');
  const rd = UI.panel(side, 'Readouts'), R = UI.read(rd, [{ id: 'best', label: 'Best single threshold on the line' }, { id: 'sep', label: 'Separable after the lift?' }, { id: 'w', label: 'w' }, { id: 'b', label: 'b' }, { id: 'marg', label: 'Margin (distance in the plane)' }, { id: 'thr', label: 'Thresholds on the original line' }, { id: 'sv', label: 'Support vectors' }]);

  const A = UI.plotCard(stage, 'Original readings: no single threshold works', { xlim: [-3, 3], ylim: [-1, 1], aspect: 3.8, margin: { l: 14, r: 14, t: 8, b: 34 }, interactive: true, label: 'Number line of readings with thresholds' }, 'Dotted: the best single threshold. Solid: the two thresholds that the lifted SVM implies.');
  SU.legend(A.card, 'healthy', 'failing');
  const B = UI.plotCard(stage, 'After the lift', { xlim: [-3, 3], ylim: [-0.6, 4.8], aspect: 1.8, margin: { l: 48, r: 12, t: 10, b: 40 }, label: 'Lifted readings in the plane' }, '');

  const feats = (z) => (map === 'zz2' ? [z, z * z] : map === 'z2' ? [z * z] : [z]);
  function bestSingle() { const zs = pts.map((p) => p.x).sort((a, b) => a - b); let best = 0, bt = 0, bs = 1; for (let i = 0; i <= zs.length; i++) { const t = i === 0 ? zs[0] - 1 : i === zs.length ? zs[zs.length - 1] + 1 : (zs[i - 1] + zs[i]) / 2; for (const s of [1, -1]) { const a = pts.filter((p) => (s * (p.x - t) > 0 ? 1 : 0) === p.c).length; if (a > best) { best = a; bt = t; bs = s; } } } return { acc: best, t: bt }; }
  let single = bestSingle(), roots = [];
  function update() {
    single = bestSingle(); R.set('best', single.acc + ' of ' + pts.length + ' right', single.acc < pts.length ? 'warn' : 'good');
    model = null; roots = [];
    if (pts.some((p) => p.c) && pts.some((p) => !p.c)) {
      model = ML.svc(pts.map((p) => feats(p.x)), pts.map((p) => (p.c ? 1 : -1)), { kernel: 'linear', C: 1e4, tol: 1e-9, maxMs: 400 });
      const slack = pts.map((p) => Math.max(0, 1 - (p.c ? 1 : -1) * model.decision(feats(p.x)))); sepOK = slack.every((s) => s < 1e-3);
      const w = model.w, b = model.b; R.set('sep', sepOK ? 'yes' : 'no: the lifted points overlap', sepOK ? 'good' : 'warn'); R.set('w', '(' + Array.from(w).map((v) => UI.f(v, 3)).join(', ') + ')'); R.set('b', UI.f(b, 3)); R.set('marg', sepOK ? UI.f(1 / Math.hypot(...w), 4) : '–'); R.set('sv', model.nSV + ': z = ' + model.svIdx.map((i) => UI.f(pts[i].x, 2)).join(', '));
      if (map === 'zz2' && Math.abs(w[1]) > 1e-9) { const D = w[0] * w[0] - 4 * w[1] * b; if (D > 0) roots = [(-w[0] - Math.sqrt(D)) / (2 * w[1]), (-w[0] + Math.sqrt(D)) / (2 * w[1])].sort((a, c2) => a - c2); }
      else if (map === 'z2' && Math.abs(w[0]) > 1e-9) { const t2 = -b / w[0]; if (t2 > 0) roots = [-Math.sqrt(t2), Math.sqrt(t2)]; }
      else if (map === 'z' && Math.abs(w[0]) > 1e-9) roots = [-b / w[0]];
      R.set('thr', roots.length ? roots.map((v) => UI.f(v, 3)).join(' and ') : '–');
    } else ['sep', 'w', 'b', 'marg', 'sv', 'thr'].forEach((k) => R.set(k, '–'));
    A.plot.redraw(); B.plot.redraw();
  }
  A.plot.draw = (p) => {
    const col = p.col; p.axes({ grid: false, yticks: [], xticks: [-3, -2, -1, 0, 1, 2, 3], xlabel: 'sensor reading z' }); p.seg(-3, 0, 3, 0, { color: col.axis, w: 1.2 });
    p.seg(single.t, -0.6, single.t, 0.6, { color: col.muted, w: 2, dash: [2, 4] });
    roots.forEach((r) => { p.seg(r, -0.8, r, 0.8, { color: col.accent, w: 2.6 }); p.text(r, 0.9, UI.f(r, 2), { color: col.accent, align: 'center', weight: 700, halo: true, size: 12 }); });
    pts.forEach((q) => { const st = UI.cls(q.c); p.dot(q.x, 0, { fill: st.color, shape: st.shape, r: 7, lw: 1.8 }); });
    if (model && sepOK) model.svIdx.forEach((i) => p.ring(pts[i].x, 0, 12, { color: col.ink, w: 1.8 }));
    p.setLabel('Twelve readings on a number line with ' + roots.length + ' implied thresholds');
  };
  B.plot.draw = (p) => {
    const col = p.col;
    if (map === 'zz2') {
      p.axes({ xlabel: 'first coordinate  z', ylabel: 'second coordinate  ' + (lift < 0.995 ? lift.toFixed(2) + ' · z²' : 'z²') });
      if (lift > 0.01) { const par = []; for (let z = -2.2; z <= 2.2; z += 0.05) par.push([z, lift * z * z]); p.line(par, { color: col.axis, w: 1.4, dash: [4, 4] }); }
      if (model && lift > 0.01) { const w = model.w, b = model.b; if (Math.abs(w[1]) > 1e-9) { const line = (off) => { const pp = []; for (let z = -3; z <= 3; z += 0.1) pp.push([z, lift * (off - b - w[0] * z) / w[1]]); return pp; }; p.clip(() => { p.line(line(1), { color: col.c[1], w: 1.6, dash: [6, 5] }); p.line(line(-1), { color: col.c[0], w: 1.6, dash: [6, 5] }); p.line(line(0), { color: col.ink, w: 3 }); }); } }
      pts.forEach((q) => { const st = UI.cls(q.c); p.dot(q.x, lift * q.x * q.x, { fill: st.color, shape: st.shape, r: 6, lw: 1.6 }); });
      if (model && sepOK && lift > 0.99) model.svIdx.forEach((i) => p.ring(pts[i].x, pts[i].x * pts[i].x, 11, { color: col.ink, w: 1.8 }));
    } else {
      const xs = map === 'z2' ? pts.map((q) => q.x * q.x) : pts.map((q) => q.x), lo = map === 'z2' ? -0.2 : -3, hi = map === 'z2' ? 5 : 3; p.setLims([lo, hi], [-1, 1]); p._layout();
      p.axes({ grid: false, yticks: [], xlabel: map === 'z2' ? 'the single feature  z²' : 'the single feature  z (no lift)' }); p.seg(lo, 0, hi, 0, { color: col.axis, w: 1.2 });
      if (model) { const w = model.w[0], b = model.b; if (Math.abs(w) > 1e-9) { const t = -b / w; p.seg(t, -0.7, t, 0.7, { color: col.ink, w: 3 }); p.seg(t - 1 / Math.abs(w), -0.3, t - 1 / Math.abs(w), 0.3, { color: col.accent, w: 1.2, dash: [2, 3] }); p.seg(t + 1 / Math.abs(w), -0.3, t + 1 / Math.abs(w), 0.3, { color: col.accent, w: 1.2, dash: [2, 3] }); } }
      pts.forEach((q, i) => { const st = UI.cls(q.c); p.dot(xs[i], 0, { fill: st.color, shape: st.shape, r: 6.5, lw: 1.6 }); });
    }
    p.setLabel('Readings after the ' + (map === 'zz2' ? 'lift to (z, z squared)' : map === 'z2' ? 'map to z squared' : 'identity map'));
  };
  let drag = -1;
  A.plot.on('down', (e) => { let best = -1, bd = 16; pts.forEach((q, i) => { const d = Math.hypot(A.plot.X(q.x) - e.px, A.plot.Y(0) - e.py); if (d < bd) { bd = d; best = i; } }); if (best < 0) return false; drag = best; return true; })
    .on('move', (e) => { if (drag >= 0) { pts[drag].x = UI.clamp(e.x, -2.9, 2.9); update(); } }).on('up', () => { drag = -1; })
    .on('hover', (e) => { A.plot.canvas.style.cursor = pts.some((q) => Math.hypot(A.plot.X(q.x) - e.px, A.plot.Y(0) - e.py) < 16) ? 'ew-resize' : 'default'; });
  update();
})();
