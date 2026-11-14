/* PCA directions: spin a line through a point cloud, see variance kept and lost, compare with PC1 from eigen and SVD. */
(function () {
  'use strict';
  const { stage, side } = UI.shell('pca/directions');
  const h = UI.h;
  let pts = [], preset = 'correlated', seed = 7, sweep = null;
  const gen = (rng, n, s1, s2, deg, cx, cy) => { const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return Array.from({ length: n }, () => { const u = s1 * rng.normal(), v = s2 * rng.normal(); return [cx + c * u - s * v, cy + s * u + c * v]; }); };
  const PRESETS = {
    correlated: { label: 'Correlated cloud', make: (r) => gen(r, 70, 1.5, 0.45, 32, 0, 0) },
    steep: { label: 'Steep, narrow cloud', make: (r) => gen(r, 70, 1.4, 0.3, 110, 0, 0) },
    round: { label: 'Round cloud (no preferred direction)', make: (r) => gen(r, 80, 1.0, 1.0, 0, 0, 0) },
    clusters: { label: 'Two clusters', make: (r) => gen(r, 35, 0.5, 0.5, 0, -1.6, -0.9).concat(gen(r, 35, 0.5, 0.5, 0, 1.6, 0.9)) },
  };
  const load = () => { pts = PRESETS[preset].make(ML.rng(seed)); };
  load();

  function stats() {
    const n = pts.length, m = ML.colMeans(pts); let a = 0, b = 0, c = 0;
    for (const p of pts) { const x = p[0] - m[0], y = p[1] - m[1]; a += x * x; b += x * y; c += y * y; }
    const C = [[a / (n - 1), b / (n - 1)], [b / (n - 1), c / (n - 1)]], e = ML.eigSym(C), cen = pts.map((p) => [p[0] - m[0], p[1] - m[1]]), sv = ML.svd(cen);
    let phi = Math.atan2(e.vectors[0][1], e.vectors[0][0]) * 180 / Math.PI; if (phi < 0) phi += 180; if (phi >= 180) phi -= 180;
    return { n, m, C, e, sv, phi, total: C[0][0] + C[1][1] };
  }
  const along = (st, deg) => { const t = deg * Math.PI / 180, u = [Math.cos(t), Math.sin(t)]; return u[0] * u[0] * st.C[0][0] + 2 * u[0] * u[1] * st.C[0][1] + u[1] * u[1] * st.C[1][1]; };
  let theta = 20, showRes = true, showPC = true, st = stats();

  /* controls */
  const ctl = UI.panel(side, 'Your line');
  const aSl = UI.slider(ctl, { label: 'Angle θ', min: 0, max: 180, step: 0.5, value: theta, fmt: (v) => v.toFixed(1) + '°', onInput(v) { theta = v; stopSweep(); update(); } });
  const bt = UI.buttons(ctl, [
    { id: 'snap', label: 'Snap to PC1', primary: true, onClick() { stopSweep(); theta = st.phi; aSl.set(theta); update(); } },
    { id: 'sweep', label: 'Sweep 0→180°', onClick() { sweep ? stopSweep() : startSweep(); } }]);
  UI.check(ctl, { label: 'Show distances lost (projection lines)', value: true, onChange(v) { showRes = v; update(); } });
  UI.check(ctl, { label: 'Show PC1 and PC2 axes', value: true, onChange(v) { showPC = v; update(); } });
  const dat = UI.panel(side, 'Data');
  const sel = UI.select(dat, { label: 'Cloud', options: Object.keys(PRESETS).map((k) => ({ value: k, label: PRESETS[k].label })), value: preset, onChange(v) { preset = v; load(); st = stats(); update(); } });
  UI.buttons(dat, [
    { label: 'New sample', onClick() { seed++; load(); st = stats(); update(); } },
    { label: 'Remove last point', onClick() { if (pts.length > 3) { pts.pop(); st = stats(); update(); } } }]);
  UI.note(dat, 'Click the plot to add a point. Drag a point to move it.');
  const rd = UI.panel(side, 'Readouts'), R = UI.read(rd, [
    { id: 'kept', label: 'Variance along your line' }, { id: 'share', label: 'Share of total variance' }, { id: 'lost', label: 'Squared distance lost (÷ n−1)' }, { id: 'sum', label: 'Kept + lost' },
    { id: 'phi', label: 'PC1 direction' }, { id: 'gap', label: 'Your angle vs PC1' }, { id: 'eig', label: 'λ₁ from covariance eigen' }, { id: 'svd', label: 's₁² / (n−1) from SVD' }, { id: 'diff', label: 'Difference' }]);

  /* plots */
  const row = h('div', { class: 'row' }); stage.append(row);
  const A = UI.plotCard(stage, 'The cloud and your line', { xlim: [-4.2, 4.2], ylim: [-3, 3], aspect: 1.45, equal: true, interactive: true, label: 'Scatter plot of points with a rotatable line' },
    'Drag points, or click to add one. Thin segments show the squared distance lost when each point is projected onto the line.');
  const B = UI.plotCard(stage, 'Variance along every direction', { xlim: [0, 180], ylim: [0, 4], aspect: 2.3, margin: { l: 52, b: 42 }, label: 'Variance against angle' },
    'Kept variance peaks at PC1 and is lowest at PC2. The lost curve is its mirror image.');
  UI.legend(B.card, [{ label: 'variance kept along θ', color: UI.colors().c[0], shape: 'line' }, { label: 'squared distance lost', color: UI.colors().c[1], shape: 'dash' }]);

  A.plot.draw = (p, c) => {
    const col = p.col; p.axes({ zero: true });
    const t = theta * Math.PI / 180, u = [Math.cos(t), Math.sin(t)], m = st.m;
    p.abline(-u[1], u[0], u[1] * m[0] - u[0] * m[1], { color: col.accent, w: 2.4 });
    if (showPC) {
      [0, 1].forEach((k) => { const v = st.e.vectors[k], len = Math.sqrt(st.e.values[k]) * 2; p.seg(m[0] - v[0] * len, m[1] - v[1] * len, m[0] + v[0] * len, m[1] + v[1] * len, { color: col.c[k === 0 ? 1 : 2], w: 2, dash: [6, 5], alpha: .9 }); });
      const v = st.e.vectors[0], len = Math.sqrt(st.e.values[0]) * 2.15; p.text(m[0] + v[0] * len, m[1] + v[1] * len, 'PC1', { color: col.c[1], weight: 700, halo: true, dx: 6 });
      const w = st.e.vectors[1], l2 = Math.sqrt(st.e.values[1]) * 2.4 + .25; p.text(m[0] + w[0] * l2, m[1] + w[1] * l2, 'PC2', { color: col.c[2], weight: 700, halo: true, dx: 6 });
    }
    pts.forEach((q) => { const d = (q[0] - m[0]) * u[0] + (q[1] - m[1]) * u[1], fx = m[0] + d * u[0], fy = m[1] + d * u[1]; if (showRes) p.seg(q[0], q[1], fx, fy, { color: col.c[1], w: 1.2, alpha: .55 }); });
    pts.forEach((q) => p.dot(q[0], q[1], { fill: col.c[0], r: 4.6 }));
    pts.forEach((q) => { const d = (q[0] - m[0]) * u[0] + (q[1] - m[1]) * u[1]; p.dot(m[0] + d * u[0], m[1] + d * u[1], { fill: col.accent, r: 2.4, lw: 0 }); });
    p.dot(m[0], m[1], { shape: 'cross', fill: col.ink, r: 6, lw: 2.5 });
    p.setLabel(`Scatter of ${pts.length} points; your line is at ${theta.toFixed(0)} degrees and keeps ${(100 * along(st, theta) / st.total).toFixed(0)} percent of the variance. PC1 is at ${st.phi.toFixed(0)} degrees.`);
  };
  B.plot.draw = (p, c) => {
    const col = p.col; p.setLims(null, [0, st.total * 1.08]); p._layout();
    p.axes({ xlabel: 'angle θ of the line (degrees)', ylabel: 'variance', xticks: [0, 30, 60, 90, 120, 150, 180] });
    const kept = [], lost = []; for (let d = 0; d <= 180; d += 1) { const v = along(st, d); kept.push([d, v]); lost.push([d, st.total - v]); }
    p.line(lost, { color: col.c[1], w: 2, dash: [6, 5] }); p.line(kept, { color: col.c[0], w: 3 });
    p.seg(st.phi, 0, st.phi, st.total * 1.08, { color: col.ink2, w: 1.2, dash: [3, 4] }); p.text(st.phi, st.total * 1.04, 'PC1', { color: col.ink2, weight: 700, align: st.phi > 150 ? 'right' : 'left', dx: st.phi > 150 ? -5 : 5 });
    p.seg(theta, 0, theta, along(st, theta), { color: col.accent, w: 1.4 });
    p.dot(theta, along(st, theta), { fill: col.accent, r: 6 }); p.dot(theta, st.total - along(st, theta), { fill: col.c[1], r: 4.5, shape: 'square' });
    p.text(179, st.total + .0, 'total variance', { color: col.muted, align: 'right', dy: -9, size: 11.5 }); p.seg(0, st.total, 180, st.total, { color: col.axis, w: 1, dash: [2, 4] });
  };

  /* interaction on the cloud */
  let drag = -1;
  A.plot.on('down', (e) => {
    const px = (q) => Math.hypot(A.plot.X(q[0]) - e.px, A.plot.Y(q[1]) - e.py); let best = -1, bd = 14;
    pts.forEach((q, i) => { const d = px(q); if (d < bd) { bd = d; best = i; } });
    if (best < 0) { if (pts.length >= 400 || e.x < A.plot.vx[0] || e.x > A.plot.vx[1] || e.y < A.plot.vy[0] || e.y > A.plot.vy[1]) return false; pts.push([e.x, e.y]); best = pts.length - 1; }
    drag = best; sel.set('custom'); preset = 'custom'; return true;
  }).on('move', (e) => { if (drag >= 0) { pts[drag] = [UI.clamp(e.x, A.plot.vx[0], A.plot.vx[1]), UI.clamp(e.y, A.plot.vy[0], A.plot.vy[1])]; st = stats(); update(); } })
    .on('up', () => { drag = -1; st = stats(); update(); });
  A.plot.canvas.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { theta = (theta + (e.key === 'ArrowRight' ? 1 : -1) * 1 + 180) % 180; aSl.set(theta); update(); e.preventDefault(); } });
  function startSweep() { theta = 0; bt.sweep.textContent = 'Stop'; const t0 = performance.now(); const from = theta; sweep = requestAnimationFrame(function step(now) { theta = Math.min(180, (now - t0) / 6000 * 180); aSl.set(theta); update(); if (theta < 180 && sweep) sweep = requestAnimationFrame(step); else stopSweep(); }); }
  function stopSweep() { if (sweep) cancelAnimationFrame(sweep); sweep = null; bt.sweep.textContent = 'Sweep 0→180°'; }
  function update() {
    const kept = along(st, theta), lost = st.total - kept; let direct = 0; const t = theta * Math.PI / 180, u = [Math.cos(t), Math.sin(t)];
    for (const q of pts) { const x = q[0] - st.m[0], y = q[1] - st.m[1], d = -x * u[1] + y * u[0]; direct += d * d; } direct /= (st.n - 1);
    R.set('kept', UI.f(kept, 3)); R.set('share', UI.pct(kept / st.total)); R.set('lost', UI.f(direct, 3)); R.set('sum', UI.f(kept + direct, 3) + ' = total ' + UI.f(st.total, 3));
    R.set('phi', st.phi.toFixed(1) + '°'); let g = Math.abs(theta - st.phi); g = Math.min(g, 180 - g); R.set('gap', g.toFixed(1) + '°', g < 3 ? 'good' : '');
    const s1 = st.sv.s[0] * st.sv.s[0] / (st.n - 1); R.set('eig', UI.f(st.e.values[0], 6)); R.set('svd', UI.f(s1, 6)); R.set('diff', Math.abs(s1 - st.e.values[0]).toExponential(1));
    A.plot.redraw(); B.plot.redraw();
  }
  update();
})();
