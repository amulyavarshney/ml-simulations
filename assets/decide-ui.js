/* decide-ui.js: shared pieces for the Session 6 pages (needs ui.js, eval-ui.js and ml-decide.js):
 * the reliability diagram with its histogram and a keyboard-readable bin read-out, a confusion table with money, number formats. */
(function () {
  'use strict';
  const DU = (window.DU = {}), h = UI.h;

  DU.n = (x) => Math.round(x).toLocaleString('en-US');
  /** money with a thousands separator and a real minus sign; no currency symbol, so it reads in any currency */
  DU.money = (x) => (x < 0 ? '−' : '') + Math.round(Math.abs(x)).toLocaleString('en-US');
  DU.signed = (x) => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.round(Math.abs(x)).toLocaleString('en-US');
  /** 0.9 -> '0.9', 0.05 -> '0.05', 1 -> '1.0' (bin edges in words) */
  DU.edge = (v) => { const s = v.toFixed(2); return s.endsWith('0') ? s.slice(0, -1) : s; };
  DU.pct = (v, d) => (v == null || !isFinite(v) ? '–' : (100 * v).toFixed(d == null ? 0 : d) + '%');
  DU.job = EVU.job;
  /** plot height rule: width / desktop on wide screens, width / narrow on phones, so labels fit */
  DU.asp = (desktop, narrow) => (w) => (w < 560 ? narrow : desktop);

  /** Reliability diagram over a histogram of forecasts. Curves are [{name, bins (from ML.reliability), color, shape, dash}].
   *  Hover, tap or the arrow keys (when the diagram has focus) select a bin and write it in words below. o: title, cap, noun (default 'repaid'), who ('cases'). */
  DU.relCard = function (parent, o) {
    const noun = o.noun || 'repaid', host = h('div'), hostH = h('div'), card = h('section', { class: 'card plotcard' }, o.title ? h('h3', { text: o.title }) : null, host, hostH);
    const info = h('div', { class: 'note callout', role: 'status', 'aria-live': 'polite', style: { margin: '10px 6px 0' } }); const capEl = h('div', { class: 'cap', html: o.cap || '' }); card.append(info, capEl); parent.append(card);
    const rel = new UI.Plot(host, { xlim: [0, 1], ylim: [0, 1], aspectFn: DU.asp(o.aspect || 1.7, 1.25), margin: { l: 52, r: 14, t: 12, b: 42 }, hover: true, label: 'Reliability diagram' });
    const hist = new UI.Plot(hostH, { xlim: [0, 1], ylim: [0, 1], aspectFn: DU.asp(5.2, 2.6), margin: { l: 52, r: 14, t: 6, b: 38 }, hover: true, label: 'Histogram of the forecasts' });
    let curves = [], sel = -1, histIdx = 0, nb = 10;
    function words() {
      if (!curves.length) { info.textContent = ''; return; }
      if (sel < 0) { info.innerHTML = 'Hover over the diagram, tap it, or focus it and press the left and right arrow keys to read one bin.'; return; }
      info.innerHTML = curves.map((c) => { const b = c.bins.bins[sel]; return (curves.length > 1 ? '<b>' + c.name + '</b>: ' : '') + (b.n ? 'predicted ' + DU.edge(b.lo) + ' to ' + DU.edge(b.hi) + ': <b>' + DU.n(b.n) + '</b> case' + (b.n === 1 ? '' : 's') + ', <b>' + Math.round(100 * b.rate) + '%</b> really ' + noun : 'predicted ' + DU.edge(b.lo) + ' to ' + DU.edge(b.hi) + ': no cases'); }).join('<br>');
    }
    function pick(x) { sel = Math.max(0, Math.min(nb - 1, Math.floor(x * nb))); rel.redraw(); hist.redraw(); words(); }
    function tip(e, x) { if (!curves.length) return; pick(x); UI.tip.show(curves.map((c) => { const b = c.bins.bins[sel]; return (curves.length > 1 ? '<b>' + c.name + '</b><br>' : '') + (b.n ? 'predicted ' + DU.edge(b.lo) + ' to ' + DU.edge(b.hi) + ': ' + DU.n(b.n) + ' cases, ' + Math.round(100 * b.rate) + '% really ' + noun : 'predicted ' + DU.edge(b.lo) + ' to ' + DU.edge(b.hi) + ': no cases'); }).join('<br>'), e.cx, e.cy); }
    [rel, hist].forEach((p) => {
      p.canvas.tabIndex = 0; p.on('hover', (e) => tip(e, e.x)).on('leave', () => { UI.tip.hide(); });
      p.canvas.addEventListener('pointerdown', (ev) => { const r = p.canvas.getBoundingClientRect(), px = (ev.clientX - r.left) * (p.W / r.width); if (curves.length) { pick(p.iX(px)); } });
      p.canvas.addEventListener('keydown', (ev) => { if (!curves.length) return; let d = 0; if (ev.key === 'ArrowRight' || ev.key === 'ArrowUp') d = 1; else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowDown') d = -1; else if (ev.key === 'Home') sel = 0; else if (ev.key === 'End') sel = nb - 1; else return; ev.preventDefault(); if (d) sel = sel < 0 ? (d > 0 ? 0 : nb - 1) : Math.max(0, Math.min(nb - 1, sel + d)); rel.redraw(); hist.redraw(); words(); });
    });
    rel.draw = (p) => {
      const col = p.col; p.axes({ xlabel: 'predicted probability of ' + noun, ylabel: 'share that really ' + noun, xticks: [0, 0.2, 0.4, 0.6, 0.8, 1], yticks: [0, 0.2, 0.4, 0.6, 0.8, 1], xfmt: (v) => v.toFixed(1), yfmt: (v) => v.toFixed(1) });
      if (sel >= 0 && curves.length) p.rect(sel / nb, 0, (sel + 1) / nb, 1, { fill: col.accent, alpha: 0.1 });
      p.seg(0, 0, 1, 1, { color: col.muted, w: 1.8, dash: [6, 5] });
      let maxN = 1; curves.forEach((c) => c.bins.bins.forEach((b) => { if (b.n > maxN) maxN = b.n; }));
      curves.forEach((c) => {
        const pts = c.bins.bins.filter((b) => b.n).map((b) => [b.meanP, b.rate, b.n]); if (pts.length > 1) p.line(pts.map((q) => [q[0], q[1]]), { color: c.color, w: 2.2, dash: c.dash, alpha: 0.9 });
        pts.forEach((q) => p.dot(q[0], q[1], { fill: c.color, shape: c.shape || 'circle', r: c.fixed ? 5 : 3.5 + 8 * Math.sqrt(q[2] / maxN), lw: 1.6, alpha: 0.92 }));
      });
      if (curves.length) p.setLabel('Reliability diagram: ' + curves.map((c) => c.name + ' expected calibration error ' + c.bins.ece.toFixed(3)).join('; '));
    };
    hist.draw = (p) => {
      const col = p.col, c = curves[histIdx]; let mx = 1; if (c) c.bins.bins.forEach((b) => { if (b.n > mx) mx = b.n; }); const top = Math.max(1, Math.ceil(mx / 100) * 100); p.setLims(null, [0, top]); p._layout();
      p.axes({ xlabel: 'predicted probability of ' + noun, ylabel: 'cases', xticks: [0, 0.2, 0.4, 0.6, 0.8, 1], xfmt: (v) => v.toFixed(1), yticks: ML.niceTicks(0, top, 3) });
      if (!c) return; c.bins.bins.forEach((b, i) => { if (b.n) p.rect(b.lo + 0.08 / nb, 0, b.hi - 0.08 / nb, b.n, { fill: i === sel ? col.accent : (c.color), alpha: i === sel ? 0.95 : 0.7, stroke: col.surface, w: 1 }); });
    };
    return {
      card, rel, hist, info, words,
      set(cs, opts) { curves = cs; histIdx = (opts && opts.hist) || 0; nb = cs.length ? cs[0].bins.bins.length : 10; if (sel >= nb) sel = -1; rel.redraw(); hist.redraw(); words(); },
      select(i) { sel = i; rel.redraw(); hist.redraw(); words(); },
    };
  };

  /** the 2 x 2 table of decisions against outcomes with money. Call set({ap_rep, ap_def, re_rep, re_def}, gain, loss). */
  DU.decisionTable = function (parent) {
    const t = EVU.table(parent, ['', 'Repaid', 'Defaulted', 'Money'], [['', '', '', ''], ['', '', '', ''], ['', '', '', '']], { cls: 'compact', caption: 'Decisions against outcomes, with the money each cell makes or loses' });
    return {
      set(c, gain, loss) {
        const cell = (n, money, cls) => ({ html: '<b>' + DU.n(n) + '</b><br>' + (money === 0 ? '0' : DU.signed(money)), cls });
        t.set([
          ['Approve', cell(c.apRep, gain * c.apRep, 'good'), cell(c.apDef, -loss * c.apDef, 'bad'), { html: '<b>' + DU.signed(gain * c.apRep - loss * c.apDef) + '</b>', cls: gain * c.apRep - loss * c.apDef >= 0 ? 'good' : 'bad' }],
          ['Reject', cell(c.reRep, 0), cell(c.reDef, 0), { html: '0' }],
          ['All applicants', { html: DU.n(c.apRep + c.reRep) }, { html: DU.n(c.apDef + c.reDef) }, { html: '<b>' + DU.signed(gain * c.apRep - loss * c.apDef) + '</b>' }],
        ]);
      },
    };
  };
  /** a round bin width at least `min`: 1, 2 or 5 times a power of ten */
  DU.niceWidth = function (x, min) { const v = Math.max(x, min || 0), mag = Math.pow(10, Math.floor(Math.log10(v))), f = v / mag; return Math.max(min || 0, (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * mag); };
  /** histogram of bootstrap differences (in accuracy points) with the 95% interval shaded, zero marked and the observed value as a diamond.
   *  boot: {diffs, ci: [lo, hi], gap, n}. Bars are centred on zero so exact ties sit in the middle bar. */
  DU.bootDraw = function (p, boot, label) {
    const col = p.col;
    if (!boot || !boot.ci) { p.setLims([-8, 8], [0, 10]); p._layout(); p.axes({ xlabel: label }); return; }
    const d = boot.diffs, sd = ML.stats(d).sd, w = DU.niceWidth(sd / 3, 100 / boot.n), span = 4.3 * sd, lo = (Math.floor((boot.gap - span) / w - 0.5) + 0.5) * w, hi = (Math.floor((boot.gap + span) / w - 0.5) + 1.5) * w, cnt = EVU.bin(d, lo, hi, w);
    let mx = 10; cnt.forEach((k) => { if (k > mx) mx = k; }); const top = Math.ceil(mx * 1.1 / 10) * 10;
    p.setLims([Math.min(lo, -0.5 * w), Math.max(hi, 0.5 * w)], [0, top]); p._layout();
    p.axes({ xlabel: label, ylabel: 'resamples', xticks: ML.niceTicks(p.vx[0], p.vx[1], 8), xfmt: (v) => (v > 0 ? '+' : v < 0 ? '\u2212' : '') + Math.abs(+v.toFixed(2)), yticks: ML.niceTicks(0, top, 4) });
    p.rect(boot.ci[0], 0, boot.ci[1], top, { fill: col.accent, alpha: 0.09 });
    cnt.forEach((k, i) => { if (k) p.rect(lo + i * w + w * 0.06, 0, lo + (i + 1) * w - w * 0.06, k, { fill: col.c[0], alpha: 0.85, stroke: col.surface, w: 1 }); });
    p.seg(boot.ci[0], 0, boot.ci[0], top, { color: col.accent, w: 2 }); p.seg(boot.ci[1], 0, boot.ci[1], top, { color: col.accent, w: 2 }); p.seg(0, 0, 0, top, { color: col.ink, w: 1.8 }); p.dot(boot.gap, top * 0.04, { fill: col.c[1], shape: 'diamond', r: 7 });
    p.setLabel('Bootstrap gaps: observed ' + boot.gap.toFixed(1) + ' points, 95% interval ' + boot.ci[0].toFixed(1) + ' to ' + boot.ci[1].toFixed(1));
  };
})();
