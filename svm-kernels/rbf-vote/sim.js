/* The RBF score on a number line as a weighted vote: bumps alpha*y*K, offset b, probe table, effective voters. */
(function () {
  'use strict';
  const { stage, side } = UI.shell('svm-kernels/rbf-vote');
  const h = UI.h;
  const base = () => [-0.55, -0.35, -0.15, 0.05, 0.25, 0.5].map((x) => ({ x, c: 0 })).concat([-2.0, -1.55, -1.25, 1.2, 1.6, 2.05].map((x) => ({ x, c: 1 })));
  let pts = base(), gamma = 1, C = 10, probe = 1.0, model = null, offsetShare = 0;

  const c = UI.panel(side, 'RBF SVM');
  UI.slider(c, { label: 'γ (gamma)', min: 0.01, max: 1000, log: true, value: gamma, fmt: (v) => UI.sci(v), onInput(v) { gamma = v; update(); } });
  UI.slider(c, { label: 'C', min: 0.1, max: 1000, log: true, value: C, fmt: (v) => UI.sci(v), onInput(v) { C = v; update(); } });
  const pS = UI.slider(c, { label: 'Probe z*', min: -3, max: 3, step: 0.01, value: probe, fmt: (v) => v.toFixed(2), onInput(v) { probe = v; update(); } });
  UI.buttons(c, [{ label: 'Reset readings', onClick() { pts = base(); update(); } }]);
  UI.note(c, 'Drag a reading sideways, or drag the probe line.');
  const rd = UI.panel(side, 'Readouts'), R = UI.read(rd, [{ id: 'sv', label: 'Support vectors' }, { id: 'b', label: 'Offset b' }, { id: 'f', label: 'Score at probe, f(z*)' }, { id: 'eff', label: 'Effective voters at probe' }, { id: 'far', label: 'Positions where |votes| < |b|' }]);

  const A = UI.plotCard(stage, 'The score as a sum of bumps', { xlim: [-3, 3], ylim: [-2.6, 2.6], aspect: 2.1, margin: { l: 52, r: 14, t: 12, b: 60 }, interactive: true, label: 'Bumps contributed by each support vector, their sum plus the offset, and the readings' }, 'Thin curves: one bump per support vector (orange = failing, blue = healthy). Thick curve: sum of bumps + b. Dotted: the offset b.');
  UI.legend(A.card, [{ label: 'sum of bumps + b = score f(z)', color: UI.colors().ink, shape: 'line' }, { label: 'bump with α·y > 0 (failing)', color: UI.colors().c[1], shape: 'line' }, { label: 'bump with α·y < 0 (healthy)', color: UI.colors().c[0], shape: 'line' }, { label: 'offset b', color: UI.colors().muted, shape: 'dash' }]);
  const T = h('section', { class: 'card panel' }, h('h3', { text: 'Votes at the probe' })), tb = h('div'); T.append(tb); stage.append(T);

  const fz = (z) => model.decision([z]);
  const bOf = () => (Math.abs(-model.rho) < 1e-9 ? 0 : -model.rho); // an offset below 1e-9 is rounding noise, so treat it as exactly 0
  function update() {
    model = ML.svc(pts.map((q) => [q.x]), pts.map((q) => (q.c ? 1 : -1)), { kernel: 'rbf', gamma, C, tol: 1e-9, maxMs: 300 });
    const b = bOf(), zeroB = b === 0, rows = model.svIdx.map((i, j) => { const kv = Math.exp(-gamma * (probe - model.SV[j][0]) ** 2); return { z: model.SV[j][0], w: model.coef[j], kv, v: model.coef[j] * kv }; }), sum = rows.reduce((s, q) => s + q.v, 0), sk = rows.reduce((s, q) => s + q.kv, 0), sk2 = rows.reduce((s, q) => s + q.kv * q.kv, 0), eff = sk2 > 0 ? sk * sk / sk2 : 0;
    let n = 0, tot = 0; for (let z = -3; z <= 3.0001; z += 0.02) { const s = model.svIdx.reduce((a, i, j) => a + model.coef[j] * Math.exp(-gamma * (z - model.SV[j][0]) ** 2), 0); if (Math.abs(s) < Math.abs(b)) n++; tot++; } offsetShare = n / tot;
    R.set('sv', model.nSV + ' of ' + pts.length); R.set('b', UI.f(b, 3)); R.set('f', Math.abs(sum + b) < 1e-9 ? '0.000 → about 0: no class named' : UI.f(sum + b, 3) + ' → ' + (sum + b >= 0 ? 'failing' : 'healthy')); R.set('eff', UI.f(eff, 1) + ' of ' + rows.length); if (zeroB) R.set('far', 'n/a: b is about 0, so the score is about 0 there'); else R.set('far', UI.pct(offsetShare, 0) + ' of the axis', offsetShare > 0.3 ? 'warn' : '');
    rows.sort((a, c2) => Math.abs(c2.v) - Math.abs(a.v)); tb.textContent = '';
    tb.append(h('table', { class: 't' }, h('thead', null, h('tr', null, ['support vector z', 'α·y', 'K = exp(−γ(z* − z)²)', 'vote α·y·K'].map((t) => h('th', { text: t })))), h('tbody', null, rows.map((q) => h('tr', null, h('td', { text: UI.f(q.z, 2) }), h('td', { text: UI.f(q.w, 3) }), h('td', { text: UI.f(q.kv, 4) }), h('td', { text: UI.f(q.v, 3) }))), h('tr', null, h('td', { text: 'sum of votes' }), h('td'), h('td'), h('td', { text: UI.f(sum, 3) })), h('tr', null, h('td', { text: 'offset b' }), h('td'), h('td'), h('td', { text: UI.f(b, 3) })), h('tr', { style: { fontWeight: 700 } }, h('td', { text: 'score f(z*)' }), h('td'), h('td'), h('td', { text: UI.f(sum + b, 3) })))));
    tb.append(h('p', { class: 'note', html: 'These votes are not normalised: nothing forces them to add to 1. Where every K is tiny, the sum of votes is near 0 and the sign of the score is the sign of b.' + (zeroB ? ' Here b is about 0 (below 1e-9), so where every vote is tiny the score is about 0 and the page names no class.' : '') }));
    A.plot.redraw();
  }
  A.plot.draw = (p) => {
    const col = p.col; p.axes({ zero: true, xlabel: 'sensor reading z', ylabel: 'vote · score' }); if (!model) return; const b = bOf(), zs = []; for (let z = -3; z <= 3.0001; z += 0.02) zs.push(z);
    model.svIdx.forEach((i, j) => { const w = model.coef[j], z0 = model.SV[j][0]; p.line(zs.map((z) => [z, w * Math.exp(-gamma * (z - z0) ** 2)]), { color: w > 0 ? col.c[1] : col.c[0], w: 1.6, alpha: 0.85 }); });
    p.seg(-3, b, 3, b, { color: col.muted, w: 1.6, dash: [3, 4] }); p.text(-2.95, b, 'b = ' + UI.f(b, 2), { color: col.muted, dy: -10, size: 12, weight: 600, halo: true });
    p.line(zs.map((z) => [z, fz(z)]), { color: col.ink, w: 3.2 });
    p.seg(probe, -2.6, probe, 2.6, { color: col.accent, w: 1.4, dash: [4, 4] });
    model.svIdx.forEach((i, j) => { const v = model.coef[j] * Math.exp(-gamma * (probe - model.SV[j][0]) ** 2); p.dot(probe, v, { fill: v > 0 ? col.c[1] : col.c[0], r: 4.5, shape: v > 0 ? 'triangle' : 'circle' }); });
    p.dot(probe, fz(probe), { fill: col.ink, shape: 'diamond', r: 7 }); p.text(probe, fz(probe), 'f = ' + UI.f(fz(probe), 2), { color: col.ink, dx: 10, dy: -12, weight: 700, halo: true, size: 12, align: probe > 1.6 ? 'right' : 'left' });
    const sy = p.H - 26; pts.forEach((q) => { const st = UI.cls(q.c), px = p.X(q.x); p.ctx.save(); p.ctx.beginPath(); UI.markerPath(p.ctx, st.shape, px, sy, 5.4); p.ctx.fillStyle = st.color; p.ctx.fill(); p.ctx.restore(); });
    model.svIdx.forEach((i) => { p.ctx.save(); p.ctx.beginPath(); p.ctx.arc(p.X(pts[i].x), sy, 9, 0, 6.2832); p.ctx.strokeStyle = col.ink; p.ctx.lineWidth = 1.6; p.ctx.stroke(); p.ctx.restore(); });
    p.text(p.m.l - 8, sy, 'data', { px: true, align: 'right', size: 11.5, color: col.muted });
    p.setLabel('RBF score on a number line as a sum of bumps; probe at ' + probe.toFixed(2) + ' has score ' + fz(probe).toFixed(2));
  };
  let drag = null;
  A.plot.on('down', (e) => { const sy = A.plot.H - 26; if (Math.abs(e.py - sy) < 16) { let best = -1, bd = 14; pts.forEach((q, i) => { const d = Math.abs(A.plot.X(q.x) - e.px); if (d < bd) { bd = d; best = i; } }); if (best >= 0) { drag = best; return true; } } if (Math.abs(A.plot.X(probe) - e.px) < 14) { drag = 'p'; return true; } return false; })
    .on('move', (e) => { const x = UI.clamp(e.x, -2.95, 2.95); if (drag === 'p') { probe = x; pS.set(probe); } else if (drag !== null) pts[drag].x = x; update(); }).on('up', () => { drag = null; });
  update();
})();
