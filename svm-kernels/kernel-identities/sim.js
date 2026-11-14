/* Kernel identities: polynomial = dot product of lifted points; XOR by hand; RBF = stack of polynomial kernels (Taylor series). */
(function () {
  'use strict';
  const shell = UI.shell('svm-kernels/kernel-identities'), stage = shell.stage;
  const h = UI.h;
  let a = 2, b = 3, r = 1, xr = 1, ga = 1, gb = -0.4, gam = 0.5, terms = 10;
  const f = (v, d) => (Math.abs(v) < 1e-12 ? '0' : (+v.toFixed(d == null ? 4 : d)) + '');

  /* ---------- controls ---------- */
  const c1 = h('div', { class: 'ctlrow' });
  UI.slider(c1, { label: 'a', min: -4, max: 4, step: 0.1, value: a, fmt: (v) => v.toFixed(1), onInput(v) { a = v; poly(); } });
  UI.slider(c1, { label: 'b', min: -4, max: 4, step: 0.1, value: b, fmt: (v) => v.toFixed(1), onInput(v) { b = v; poly(); } });
  UI.slider(c1, { label: 'offset r', min: 0, max: 2, step: 0.05, value: r, fmt: (v) => v.toFixed(2), onInput(v) { r = v; poly(); } });
  UI.buttons(c1, [{ label: 'a = 2, b = 3, r = 1', onClick() { a = 2; b = 3; r = 1; sync1(); } }, { label: 'r = ½', onClick() { a = 2; b = 3; r = 0.5; sync1(); } }]);
  const c2 = h('div', { class: 'ctlrow' });
  const xS = UI.slider(c2, { label: 'Kernel offset r in (x·z + r)²', min: 0, max: 2, step: 0.05, value: xr, fmt: (v) => v.toFixed(2), onInput(v) { xr = v; xor(); } });
  const c3 = h('div', { class: 'ctlrow' });
  UI.slider(c3, { label: 'a', min: -3, max: 3, step: 0.05, value: ga, fmt: (v) => v.toFixed(2), onInput(v) { ga = v; rbf(); } });
  UI.slider(c3, { label: 'b', min: -3, max: 3, step: 0.05, value: gb, fmt: (v) => v.toFixed(2), onInput(v) { gb = v; rbf(); } });
  UI.slider(c3, { label: 'γ', min: 0.05, max: 3, step: 0.05, value: gam, fmt: (v) => v.toFixed(2), onInput(v) { gam = v; rbf(); } });
  UI.slider(c3, { label: 'Terms kept (degrees 0 … n−1)', min: 1, max: 14, step: 1, value: terms, fmt: (v) => String(Math.round(v)), onInput(v) { terms = Math.round(v); rbf(); } });
  const sliders = [...c1.querySelectorAll('input[type=range]')];
  function sync1() { sliders[0].value = a; sliders[1].value = b; sliders[2].value = r; sliders.forEach((s) => s.dispatchEvent(new Event('input'))); }

  /* ---------- panel 1 ---------- */
  const P1 = h('section', { class: 'card panel' }, h('h3', { text: '1 · The polynomial kernel is a dot product after a lift' })), t1 = h('div'); P1.append(c1, t1); stage.append(P1);
  function poly() {
    const K = Math.pow(a * b + r, 2), phi = (z) => [Math.sqrt(2 * r) * z, z * z, r], pa = phi(a), pb = phi(b), dp = ML.dot(pa, pb);
    t1.innerHTML = '<table class="t"><tbody>' +
      '<tr><td>Kernel, computed directly: (a·b + r)²</td><td>(' + f(a, 2) + '·' + f(b, 2) + ' + ' + f(r, 2) + ')² = <b>' + f(K, 6) + '</b></td></tr>' +
      '<tr><td>Lifted points φ(z) = (√(2r)·z, z², r)</td><td>φ(a) = (' + pa.map((v) => f(v, 3)).join(', ') + ')<br>φ(b) = (' + pb.map((v) => f(v, 3)).join(', ') + ')</td></tr>' +
      '<tr><td>Dot product φ(a)·φ(b)</td><td><b>' + f(dp, 6) + '</b></td></tr>' +
      '<tr><td>Difference</td><td>' + Math.abs(K - dp).toExponential(1) + '</td></tr></tbody></table>' +
      '<p class="note">Expanding (ab + r)² = 2r·ab + a²b² + r² shows why: the three terms are exactly the three products of coordinates. The kernel never builds φ.</p>';
  }

  /* ---------- panel 2 ---------- */
  const P2 = UI.plotCard(stage, '2 · XOR: four points no line can separate', { xlim: [-1.8, 1.8], ylim: [-1.8, 1.8], aspect: 2.2, equal: true, margin: { l: 38, r: 10, t: 10, b: 32 }, label: 'XOR points with the decision surface of a polynomial-kernel SVM' }, '');
  const t2 = h('div'); P2.card.insertBefore(c2, P2.host); P2.card.append(t2);
  let xm = null;
  const XP = [[1, 1], [-1, -1], [1, -1], [-1, 1]], XY = [1, 1, -1, -1];
  function xor() {
    xm = ML.svc(XP, XY, { kernel: 'poly', degree: 2, gamma: 1, coef0: xr, C: 1e6, tol: 1e-10 });
    const G = XP.map((p) => XP.map((q) => Math.pow(ML.dot(p, q) + xr, 2)));
    t2.innerHTML = '<p class="note">Gram matrix of the four points with K(x, z) = (x·z + ' + f(xr, 2) + ')²:</p><table class="t"><tbody>' + G.map((row) => '<tr>' + row.map((v) => '<td>' + f(v, 3) + '</td>').join('') + '</tr>').join('') + '</tbody></table>' +
      '<p class="note">SVM weights α·y: <b>' + Array.from(xm.coefAll).map((v) => f(v, 4)).join(', ') + '</b> · b = <b>' + f(-xm.rho, 4) + '</b> · f at the four points: <b>' + XP.map((p) => f(xm.decision(p), 3)).join(', ') + '</b>' + (Math.abs(xr - 1) < 1e-9 ? '<br>With r = 1 every α is exactly 1/8 and f(x) = x₁·x₂.' : '') + '</p>';
    P2.plot.redraw();
  }
  P2.plot.draw = (p) => {
    const col = p.col; p.axes({ zero: true }); if (!xm) return;
    const fld = p.field((x, y) => xm.decision([x, y]), 70, 56); p.heat(fld, (v) => { const c = UI.rgb(v >= 0 ? col.c[1] : col.c[0]); return [c[0], c[1], c[2], Math.round(255 * Math.min(0.3, 0.05 + 0.1 * Math.min(Math.abs(v), 2)))]; });
    p.contour(fld, 0, { color: col.ink, w: 2.6 }); p.contour(fld, 1, { color: col.c[1], w: 1.3, dash: [5, 4] }); p.contour(fld, -1, { color: col.c[0], w: 1.3, dash: [5, 4] });
    XP.forEach((q, i) => { const st = UI.cls(XY[i] > 0 ? 1 : 0); p.dot(q[0], q[1], { fill: st.color, shape: st.shape, r: 8, lw: 2 }); });
    p.text(1.75, -1.65, 'solid line: f = 0', { align: 'right', color: col.ink2, size: 12, weight: 600, halo: true });
  };

  /* ---------- panel 3 ---------- */
  const P3 = UI.plotCard(stage, '3 · The RBF kernel as a stack of polynomial kernels', { xlim: [-0.6, 14.6], ylim: [0, 1], aspect: 2.3, margin: { l: 56, r: 12, t: 12, b: 42 }, hover: true, label: 'Contributions of each degree and the running total against the exact RBF value' }, '');
  const t3 = h('div'); P3.card.insertBefore(c3, P3.host); P3.card.append(t3); UI.legend(P3.card, [{ label: 'contribution of degree n', color: UI.colors().c[0], shape: 'square' }, { label: 'running total', color: UI.colors().ink, shape: 'line' }, { label: 'exact value', color: UI.colors().c[1], shape: 'dash' }]);
  let ser = null;
  function rbf() {
    const exact = Math.exp(-gam * (ga - gb) * (ga - gb)), pref = Math.exp(-gam * ga * ga - gam * gb * gb), tt = [], cum = []; let fac = 1, s = 0;
    for (let n = 0; n < 14; n++) { if (n > 0) fac *= n; const v = pref * Math.pow(2 * gam * ga * gb, n) / fac; tt.push(v); s += v; cum.push(s); }
    ser = { exact, tt, cum }; const err = Math.abs(exact - cum[terms - 1]);
    const coord = (z) => Array.from({ length: Math.min(terms, 6) }, (_, n) => Math.exp(-gam * z * z) * Math.pow(Math.sqrt(2 * gam) * z, n) / Math.sqrt(factorial(n)));
    t3.innerHTML = '<table class="t"><tbody><tr><td>Exact kernel exp(−γ(a − b)²)</td><td><b>' + f(exact, 8) + '</b></td></tr><tr><td>Series, degrees 0 … ' + (terms - 1) + '</td><td><b>' + f(cum[terms - 1], 8) + '</b></td></tr><tr><td>Error after ' + terms + ' term' + (terms > 1 ? 's' : '') + '</td><td>' + err.toExponential(1) + '</td></tr></tbody></table>' +
      '<p class="note">Each term is the polynomial kernel of degree n scaled by e<sup>−γa² − γb²</sup>/n!. The coordinates behind it are e<sup>−γz²</sup>·(√(2γ)·z)<sup>n</sup> / √n!, one for every n = 0, 1, 2, …<br>First coordinates of the lifted a: ' + coord(ga).map((v) => f(v, 3)).join(', ') + ', …</p>';
    P3.plot.redraw();
  }
  function factorial(n) { let v = 1; for (let i = 2; i <= n; i++) v *= i; return v; }
  P3.plot.draw = (p) => {
    const col = p.col; if (!ser) return; const mx = Math.max(ser.exact, ...ser.cum.slice(0, 14), ...ser.tt.map(Math.abs)) * 1.15, mn = Math.min(0, ...ser.tt) * 1.15; p.setLims([-0.6, 14.6], [mn, mx]); p._layout();
    p.axes({ xlabel: 'degree n of the term  (a·b)ⁿ ∕ n!', ylabel: 'value', xticks: [0, 2, 4, 6, 8, 10, 12, 13], zero: true });
    ser.tt.forEach((v, n) => p.rect(n - 0.32, 0, n + 0.32, v, { fill: v >= 0 ? col.c[0] : col.c[1], alpha: n < terms ? 0.95 : 0.25 }));
    p.seg(-0.6, ser.exact, 14.6, ser.exact, { color: col.c[1], w: 2, dash: [6, 5] }); p.line(ser.cum.map((v, n) => [n, v]).slice(0, terms), { color: col.ink, w: 2.6 }); ser.cum.slice(0, terms).forEach((v, n) => p.dot(n, v, { fill: col.ink, r: 4 }));
  };
  P3.plot.on('hover', (e) => { const n = Math.round(e.x); if (!ser || n < 0 || n > 13) return UI.tip.hide(); UI.tip.show('degree ' + n + '<br>term ' + f(ser.tt[n], 6) + '<br>running total ' + f(ser.cum[n], 6), e.cx, e.cy); });
  poly(); xor(); rbf(); UI.wide(shell);
})();
