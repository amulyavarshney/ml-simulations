/* ui.js: page shell, controls, canvas plots, tooltips, animation helper. No dependencies.
 * A simulation page includes sims.js (catalogue), the ML files it needs, this file, and its own sim.js. */
(function () {
  'use strict';
  const UI = (window.UI = {});
  const ROOT = new URL('../', document.currentScript ? document.currentScript.src : location.href).href;
  UI.root = ROOT;
  UI.reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------- small helpers ---------- */
  UI.h = function (tag, attrs) {
    const el = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k]; if (v == null || v === false) continue;
      if (k === 'class') el.className = v; else if (k === 'html') el.innerHTML = v; else if (k === 'text') el.textContent = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    const add = (c) => { if (c == null || c === false) return; if (Array.isArray(c)) c.forEach(add); else el.append(c.nodeType ? c : document.createTextNode(c)); };
    for (let i = 2; i < arguments.length; i++) add(arguments[i]);
    return el;
  };
  const h = UI.h;
  UI.f = (x, d) => (x == null || !isFinite(x) ? '–' : (+x).toFixed(d == null ? 2 : d));
  UI.pct = (x, d) => (x == null || !isFinite(x) ? '–' : (100 * x).toFixed(d == null ? 1 : d) + '%');
  UI.clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  UI.sci = (x) => (x === 0 ? '0' : Math.abs(x) >= 0.01 && Math.abs(x) < 1000 ? +x.toPrecision(3) + '' : x.toExponential(1));
  UI.throttle = function (fn) { let q = 0, args; return function () { args = arguments; if (!q) q = requestAnimationFrame(() => { q = 0; fn.apply(null, args); }); }; };
  UI.debounce = function (fn, ms) { let t; return function () { const a = arguments; clearTimeout(t); t = setTimeout(() => fn.apply(null, a), ms); }; };

  /* ---------- theme ---------- */
  let cache = null;
  UI.colors = function () {
    if (cache) return cache;
    const cs = getComputedStyle(document.documentElement), g = (n) => cs.getPropertyValue(n).trim();
    cache = {
      c: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => g('--c' + i)), ink: g('--ink'), ink2: g('--ink2'), muted: g('--muted'), grid: g('--grid'), axis: g('--axis'),
      surface: g('--surface'), card: g('--card'), accent: g('--accent'), mid: g('--mid'), line: g('--line'),
      seq: ['--s100', '--s250', '--s400', '--s550', '--s700'].map(g), good: g('--good'), bad: g('--bad'),
    };
    return cache;
  };
  UI.setTheme = function (mode) {
    const r = document.documentElement; if (mode === 'light' || mode === 'dark') r.setAttribute('data-theme', mode); else r.removeAttribute('data-theme');
    try { localStorage.setItem('mlsim-theme', mode); } catch (e) { /* storage may be blocked */ }
    cache = null; window.dispatchEvent(new Event('themechange'));
  };
  UI.themeMode = function () { try { return localStorage.getItem('mlsim-theme') || 'auto'; } catch (e) { return 'auto'; } };
  if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { cache = null; window.dispatchEvent(new Event('themechange')); });
  UI.alpha = function (hex, a) {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim()); if (!m) return hex;
    return 'rgba(' + parseInt(m[1], 16) + ',' + parseInt(m[2], 16) + ',' + parseInt(m[3], 16) + ',' + a + ')';
  };
  UI.rgb = function (hex) { const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim()); return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [128, 128, 128]; };
  UI.mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  /** class k -> colour and marker shape (shape is a second encoding so colour is never the only cue) */
  UI.SHAPES = ['circle', 'triangle', 'square', 'diamond', 'cross'];
  UI.cls = (k) => ({ color: UI.colors().c[k % 8], shape: UI.SHAPES[k % 5] });

  /* ---------- tooltip ---------- */
  let tipEl = null;
  UI.tip = {
    show(html, cx, cy) {
      if (!tipEl) { tipEl = h('div', { class: 'tip', role: 'status' }); document.body.append(tipEl); }
      tipEl.innerHTML = html; tipEl.style.display = 'block';
      const w = tipEl.offsetWidth, hh = tipEl.offsetHeight; let x = cx + 14, y = cy + 14;
      if (x + w > innerWidth - 8) x = cx - w - 14; if (y + hh > innerHeight - 8) y = cy - hh - 14;
      tipEl.style.left = Math.max(4, x) + 'px'; tipEl.style.top = Math.max(4, y) + 'px';
    },
    hide() { if (tipEl) tipEl.style.display = 'none'; },
  };

  /* ---------- marker shapes ---------- */
  UI.markerPath = function (ctx, shape, x, y, r) {
    ctx.beginPath();
    switch (shape) {
      case 'triangle': ctx.moveTo(x, y - r * 1.15); ctx.lineTo(x + r * 1.05, y + r * 0.8); ctx.lineTo(x - r * 1.05, y + r * 0.8); ctx.closePath(); break;
      case 'square': ctx.rect(x - r * 0.9, y - r * 0.9, r * 1.8, r * 1.8); break;
      case 'diamond': ctx.moveTo(x, y - r * 1.2); ctx.lineTo(x + r * 1.2, y); ctx.lineTo(x, y + r * 1.2); ctx.lineTo(x - r * 1.2, y); ctx.closePath(); break;
      case 'cross': ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r); ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r); break;
      case 'star': for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.5 : r * 1.35; ctx[i ? 'lineTo' : 'moveTo'](x + rr * Math.cos(a), y + rr * Math.sin(a)); } ctx.closePath(); break;
      default: ctx.arc(x, y, r, 0, 2 * Math.PI);
    }
  };
  UI.legendSwatch = function (shape, color) {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 14 14'); s.setAttribute('aria-hidden', 'true');
    const c = document.createElement('canvas'); c.width = c.height = 1; // reuse path logic through a tiny svg path generator
    let d = ''; const cx = 7, cy = 7, r = 4.6;
    if (shape === 'triangle') d = `M${cx} ${cy - r * 1.15}L${cx + r * 1.05} ${cy + r * .8}L${cx - r * 1.05} ${cy + r * .8}Z`;
    else if (shape === 'square') d = `M${cx - r * .9} ${cy - r * .9}h${r * 1.8}v${r * 1.8}h${-r * 1.8}Z`;
    else if (shape === 'diamond') d = `M${cx} ${cy - r * 1.2}L${cx + r * 1.2} ${cy}L${cx} ${cy + r * 1.2}L${cx - r * 1.2} ${cy}Z`;
    else if (shape === 'cross') d = `M${cx - r} ${cy - r}L${cx + r} ${cy + r}M${cx + r} ${cy - r}L${cx - r} ${cy + r}`;
    else if (shape === 'line') d = `M1 7H13`; else if (shape === 'dash') d = `M1 7H4M6 7H8M10 7H13`;
    else d = `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', d);
    if (shape === 'cross' || shape === 'line' || shape === 'dash') { p.setAttribute('stroke', color); p.setAttribute('stroke-width', '2'); p.setAttribute('fill', 'none'); } else { p.setAttribute('fill', color); }
    s.append(p); return s;
  };

  /* ---------- contours (marching squares) ---------- */
  UI.marching = function (vals, nx, ny, level) {
    const segs = [], v = (i, j) => vals[j * nx + i];
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = v(i, j) - level, b = v(i + 1, j) - level, c = v(i + 1, j + 1) - level, d = v(i, j + 1) - level;
      const code = (a > 0 ? 8 : 0) | (b > 0 ? 4 : 0) | (c > 0 ? 2 : 0) | (d > 0 ? 1 : 0); if (code === 0 || code === 15) continue;
      const lerp = (p, q) => (p === q ? 0.5 : p / (p - q));
      const T = [i + lerp(a, b), j], R = [i + 1, j + lerp(b, c)], B = [i + lerp(d, c), j + 1], L = [i, j + lerp(a, d)];
      const add = (p, q) => segs.push([p, q]);
      switch (code) { case 1: case 14: add(L, B); break; case 2: case 13: add(B, R); break; case 3: case 12: add(L, R); break; case 4: case 11: add(T, R); break; case 6: case 9: add(T, B); break; case 7: case 8: add(L, T); break; case 5: add(L, T); add(B, R); break; case 10: add(T, R); add(L, B); break; }
    }
    return segs;
  };

  /** draw an 8x8 digit (values 0..16) as a small grey-scale tile; ink on the current surface colour */
  UI.drawDigit = function (ctx, v, x, y, size, col) {
    const cell = size / 8, bg = UI.rgb(col.surface), fg = UI.rgb(col.ink);
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { const t = Math.min(1, Math.max(0, v[i * 8 + j] / 16)), c = UI.mix(bg, fg, t); ctx.fillStyle = 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'; ctx.fillRect(x + j * cell, y + i * cell, cell + 0.6, cell + 0.6); }
    ctx.strokeStyle = col.grid; ctx.lineWidth = 1; ctx.strokeRect(x + .5, y + .5, size - 1, size - 1);
  };

  /* ---------- the plot ---------- */
  class Plot {
    /** opts: xlim, ylim, aspect (width / height), margin {l,r,t,b}, equal (same data units per pixel), interactive, label */
    constructor(host, opts) {
      opts = opts || {}; this.opts = opts; this.host = host; this.handlers = {};
      this.xlim = (opts.xlim || [0, 1]).slice(); this.ylim = (opts.ylim || [0, 1]).slice();
      this.m = Object.assign({ l: 48, r: 14, t: 14, b: 40 }, opts.margin || {}); this.aspect = opts.aspect || 1.45;
      this.canvas = h('canvas', { role: 'img', 'aria-label': opts.label || 'Plot', tabindex: opts.interactive ? '0' : null, class: opts.interactive ? 'interactive' : '' });
      host.classList.add('plot'); host.append(this.canvas); this.ctx = this.canvas.getContext('2d');
      this.W = 0; this.H = 0; this.dpr = 1; this._raf = 0; this.draw = null;
      const ro = new ResizeObserver(() => this.resize()); ro.observe(host);
      window.addEventListener('themechange', () => this.redraw());
      if (opts.interactive || opts.hover) this._bind();
      this.resize();
    }
    setLabel(t) { this.canvas.setAttribute('aria-label', t); }
    resize() {
      const w = Math.max(220, Math.floor(this.host.clientWidth)); if (!w) return;
      const hh = Math.round(w / (this.opts.aspectFn ? this.opts.aspectFn(w) : this.aspect));
      this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      if (w !== this.W || hh !== this.H) {
        this.W = w; this.H = hh; this.canvas.width = Math.round(w * this.dpr); this.canvas.height = Math.round(hh * this.dpr);
        this.canvas.style.height = hh + 'px';
      }
      this.redraw();
    }
    redraw() { if (!this._raf) this._raf = requestAnimationFrame(() => { this._raf = 0; this.paint(); }); }
    paint() {
      if (!this.W) return;
      const ctx = this.ctx; ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.col = UI.colors(); ctx.fillStyle = this.col.surface; ctx.fillRect(0, 0, this.W, this.H);
      this._layout(); if (this.draw) this.draw(this, ctx);
    }
    _layout() {
      const m = this.m; this.pw = this.W - m.l - m.r; this.ph = this.H - m.t - m.b;
      if (this.opts.equal) { // same data units on both axes: widen the limit range of the tighter one
        const cx = (this.xlim[0] + this.xlim[1]) / 2, cy = (this.ylim[0] + this.ylim[1]) / 2;
        let sx = (this.xlim[1] - this.xlim[0]) / this.pw, sy = (this.ylim[1] - this.ylim[0]) / this.ph, s = Math.max(sx, sy);
        this.vx = [cx - s * this.pw / 2, cx + s * this.pw / 2]; this.vy = [cy - s * this.ph / 2, cy + s * this.ph / 2];
      } else { this.vx = this.xlim; this.vy = this.ylim; }
    }
    setLims(x, y) { if (x) this.xlim = x.slice(); if (y) this.ylim = y.slice(); this.redraw(); }
    X(v) { return this.m.l + (v - this.vx[0]) / (this.vx[1] - this.vx[0]) * this.pw; }
    Y(v) { return this.m.t + this.ph - (v - this.vy[0]) / (this.vy[1] - this.vy[0]) * this.ph; }
    iX(px) { return this.vx[0] + (px - this.m.l) / this.pw * (this.vx[1] - this.vx[0]); }
    iY(py) { return this.vy[0] + (this.m.t + this.ph - py) / this.ph * (this.vy[1] - this.vy[0]); }
    clip(fn) { const c = this.ctx; c.save(); c.beginPath(); c.rect(this.m.l, this.m.t, this.pw, this.ph); c.clip(); fn(c); c.restore(); }
    axes(o) {
      o = o || {}; const c = this.ctx, col = this.col, xs = o.xticks || ML.niceTicks(this.vx[0], this.vx[1], Math.max(3, Math.round(this.pw / 90))), ys = o.yticks || ML.niceTicks(this.vy[0], this.vy[1], Math.max(3, Math.round(this.ph / 60)));
      c.save(); c.lineWidth = 1; c.font = '11.5px ' + getComputedStyle(document.body).fontFamily;
      if (o.grid !== false) { c.strokeStyle = col.grid; c.beginPath(); xs.forEach((v) => { const x = Math.round(this.X(v)) + .5; c.moveTo(x, this.m.t); c.lineTo(x, this.m.t + this.ph); }); ys.forEach((v) => { const y = Math.round(this.Y(v)) + .5; c.moveTo(this.m.l, y); c.lineTo(this.m.l + this.pw, y); }); c.stroke(); }
      if (o.zero) { c.strokeStyle = col.axis; c.beginPath(); if (this.vx[0] < 0 && this.vx[1] > 0) { const x = Math.round(this.X(0)) + .5; c.moveTo(x, this.m.t); c.lineTo(x, this.m.t + this.ph); } if (this.vy[0] < 0 && this.vy[1] > 0) { const y = Math.round(this.Y(0)) + .5; c.moveTo(this.m.l, y); c.lineTo(this.m.l + this.pw, y); } c.stroke(); }
      c.strokeStyle = col.axis; c.beginPath(); c.moveTo(this.m.l + .5, this.m.t); c.lineTo(this.m.l + .5, this.m.t + this.ph + .5); c.lineTo(this.m.l + this.pw, this.m.t + this.ph + .5); c.stroke();
      c.fillStyle = col.muted; c.textAlign = 'center'; c.textBaseline = 'top';
      const xf = o.xfmt || ((v) => +v.toPrecision(6) + ''), yf = o.yfmt || ((v) => +v.toPrecision(6) + '');
      xs.forEach((v) => { c.fillText(xf(v), this.X(v), this.m.t + this.ph + 6); });
      c.textAlign = 'right'; c.textBaseline = 'middle'; ys.forEach((v) => { c.fillText(yf(v), this.m.l - 7, this.Y(v)); });
      const tickW = ys.length ? Math.max.apply(null, ys.map((v) => c.measureText(yf(v)).width)) : 0;
      c.fillStyle = col.ink2; c.font = '600 12.5px ' + getComputedStyle(document.body).fontFamily;
      if (o.xlabel) { c.textAlign = 'center'; c.textBaseline = 'bottom'; c.fillText(o.xlabel, this.m.l + this.pw / 2, this.H - 4); }
      if (o.ylabel) { c.save(); c.translate(Math.max(14, this.m.l - 7 - tickW - 6), this.m.t + this.ph / 2); c.rotate(-Math.PI / 2); c.textAlign = 'center'; c.textBaseline = 'bottom'; c.fillText(o.ylabel, 0, 0); c.restore(); }
      c.restore();
    }
    dot(x, y, o) {
      o = o || {}; const c = this.ctx, px = this.X(x), py = this.Y(y), r = o.r || 4.5;
      c.save(); if (o.alpha != null) c.globalAlpha = o.alpha;
      UI.markerPath(c, o.shape || 'circle', px, py, r);
      if (o.shape === 'cross') { c.strokeStyle = o.fill || this.col.c[0]; c.lineWidth = o.lw || 2; c.stroke(); }
      else { c.fillStyle = o.fill || this.col.c[0]; c.fill(); c.lineWidth = o.lw == null ? 1.5 : o.lw; c.strokeStyle = o.stroke || this.col.surface; if (c.lineWidth > 0) c.stroke(); }
      c.restore();
    }
    ring(x, y, r, o) { o = o || {}; const c = this.ctx; c.save(); c.beginPath(); c.arc(this.X(x), this.Y(y), r, 0, 2 * Math.PI); c.lineWidth = o.w || 1.8; c.strokeStyle = o.color || this.col.ink; if (o.dash) c.setLineDash(o.dash); c.stroke(); c.restore(); }
    line(pts, o) {
      o = o || {}; const c = this.ctx; if (pts.length < 2) return; c.save(); c.beginPath();
      pts.forEach((p, i) => c[i ? 'lineTo' : 'moveTo'](this.X(p[0]), this.Y(p[1])));
      c.strokeStyle = o.color || this.col.ink; c.lineWidth = o.w || 2; c.lineJoin = 'round'; c.lineCap = 'round'; if (o.dash) c.setLineDash(o.dash); if (o.alpha != null) c.globalAlpha = o.alpha; c.stroke(); c.restore();
    }
    seg(x1, y1, x2, y2, o) { this.line([[x1, y1], [x2, y2]], o); }
    /** infinite line a*x + b*y + c0 = level clipped to the plot */
    abline(a, b, c0, o) {
      const x0 = this.vx[0], x1 = this.vx[1], y0 = this.vy[0], y1 = this.vy[1], pts = [];
      if (Math.abs(b) > 1e-12) { pts.push([x0, (-c0 - a * x0) / b], [x1, (-c0 - a * x1) / b]); } else if (Math.abs(a) > 1e-12) { const x = -c0 / a; pts.push([x, y0], [x, y1]); }
      this.clip(() => this.line(pts, o));
    }
    poly(pts, o) { o = o || {}; const c = this.ctx; c.save(); c.beginPath(); pts.forEach((p, i) => c[i ? 'lineTo' : 'moveTo'](this.X(p[0]), this.Y(p[1]))); c.closePath(); if (o.fill) { c.globalAlpha = o.alpha == null ? 1 : o.alpha; c.fillStyle = o.fill; c.fill(); c.globalAlpha = 1; } if (o.stroke) { c.strokeStyle = o.stroke; c.lineWidth = o.w || 1.5; if (o.dash) c.setLineDash(o.dash); c.stroke(); } c.restore(); }
    rect(x0, y0, x1, y1, o) { this.poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], o); }
    text(x, y, s, o) {
      o = o || {}; const c = this.ctx; c.save(); c.font = (o.weight || 500) + ' ' + (o.size || 12.5) + 'px ' + getComputedStyle(document.body).fontFamily;
      c.fillStyle = o.color || this.col.ink2; c.textAlign = o.align || 'left'; c.textBaseline = o.base || 'middle';
      const px = o.px ? x : this.X(x), py = o.px ? y : this.Y(y) + (o.dy || 0);
      if (o.halo) { c.lineWidth = 4; c.strokeStyle = this.col.surface; c.lineJoin = 'round'; c.strokeText(s, px + (o.dx || 0), py); }
      c.fillText(s, px + (o.dx || 0), py); c.restore();
    }
    /** evaluate fn(x, y) on an nx by ny grid of cell centres across the visible plot area */
    field(fn, nx, ny) {
      const vals = new Float32Array(nx * ny), xs = [], ys = [];
      for (let i = 0; i < nx; i++) xs.push(this.vx[0] + (i + .5) / nx * (this.vx[1] - this.vx[0]));
      for (let j = 0; j < ny; j++) ys.push(this.vy[1] - (j + .5) / ny * (this.vy[1] - this.vy[0]));
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) vals[j * nx + i] = fn(xs[i], ys[j]);
      return { nx, ny, vals, xs, ys };
    }
    /** paint a field as a smooth colour image. colorFn(v) -> [r, g, b, a(0..255)] */
    heat(f, colorFn) {
      const off = document.createElement('canvas'); off.width = f.nx; off.height = f.ny; const octx = off.getContext('2d'), img = octx.createImageData(f.nx, f.ny);
      for (let k = 0; k < f.vals.length; k++) { const c = colorFn(f.vals[k]); img.data[4 * k] = c[0]; img.data[4 * k + 1] = c[1]; img.data[4 * k + 2] = c[2]; img.data[4 * k + 3] = c[3]; }
      octx.putImageData(img, 0, 0); const c = this.ctx; c.save(); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
      c.beginPath(); c.rect(this.m.l, this.m.t, this.pw, this.ph); c.clip(); c.drawImage(off, this.m.l, this.m.t, this.pw, this.ph); c.restore();
    }
    contour(f, level, o) {
      o = o || {}; const segs = UI.marching(f.vals, f.nx, f.ny, level), c = this.ctx;
      const px = (g) => this.m.l + (g[0] + .5) / f.nx * this.pw, py = (g) => this.m.t + (g[1] + .5) / f.ny * this.ph;
      c.save(); c.beginPath(); c.rect(this.m.l, this.m.t, this.pw, this.ph); c.clip(); c.beginPath();
      segs.forEach((s) => { c.moveTo(px(s[0]), py(s[0])); c.lineTo(px(s[1]), py(s[1])); });
      c.strokeStyle = o.color || this.col.ink; c.lineWidth = o.w || 2; if (o.dash) c.setLineDash(o.dash); if (o.alpha != null) c.globalAlpha = o.alpha; c.lineCap = 'round'; c.stroke(); c.restore();
    }
    on(name, fn) { this.handlers[name] = fn; return this; }
    _pos(ev) { const r = this.canvas.getBoundingClientRect(); const px = (ev.clientX - r.left) * (this.W / r.width), py = (ev.clientY - r.top) * (this.H / r.height); return { px, py, x: this.iX(px), y: this.iY(py), cx: ev.clientX, cy: ev.clientY }; }
    _bind() {
      const cv = this.canvas; let down = false;
      cv.addEventListener('pointerdown', (ev) => { if (!this.vx) return; const p = this._pos(ev); if (this.handlers.down && this.handlers.down(p, ev) !== false) { down = true; cv.setPointerCapture(ev.pointerId); ev.preventDefault(); } });
      cv.addEventListener('pointermove', (ev) => { if (!this.vx) return; const p = this._pos(ev); if (down) { if (this.handlers.move) this.handlers.move(p, ev); } else if (this.handlers.hover) this.handlers.hover(p, ev); });
      const end = (ev) => { if (down) { down = false; if (this.handlers.up) this.handlers.up(this._pos(ev), ev); } };
      cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
      cv.addEventListener('pointerleave', () => { UI.tip.hide(); if (this.handlers.leave) this.handlers.leave(); });
    }
  }
  UI.Plot = Plot;

  /* ---------- controls ---------- */
  UI.panel = function (parent, title, cls) { const p = h('section', { class: 'card panel ' + (cls || '') }, title ? h('h3', { text: title }) : null); parent.append(p); return p; };
  let uid = 0;
  UI.slider = function (parent, o) {
    const id = 'ctl' + (++uid), log = !!o.log, toPos = (v) => (log ? Math.log10(v) : v), fromPos = (p) => (log ? Math.pow(10, p) : p);
    const fmt = o.fmt || ((v) => (log ? UI.sci(v) : +(+v).toPrecision(4) + ''));
    const val = h('span', { class: 'val' }), input = h('input', { type: 'range', id, min: toPos(o.min), max: toPos(o.max), step: o.step == null ? (log ? 0.01 : 'any') : (log ? o.step : o.step), 'aria-label': o.label });
    const wrap = h('div', { class: 'ctl' }, h('label', { for: id }, o.label, val), input, o.help ? h('div', { class: 'help', html: o.help }) : null);
    parent.append(wrap);
    let cur = o.value; const set = (v, silent) => { cur = Math.min(o.max, Math.max(o.min, v)); input.value = toPos(cur); val.textContent = fmt(cur); };
    const api = { el: wrap, input, get: () => cur, set, setRange(a, b) { o.min = a; o.max = b; input.min = toPos(a); input.max = toPos(b); } };
    input.addEventListener('input', () => { let v = fromPos(+input.value); if (o.step && !log) v = Math.round(v / o.step) * o.step; cur = v; val.textContent = fmt(cur); if (o.onInput) o.onInput(cur); });
    set(o.value); return api;
  };
  UI.seg = function (parent, o) {
    const name = 'seg' + (++uid), box = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': o.label || '' }); let cur = o.value;
    o.options.forEach((opt) => {
      const r = h('input', { type: 'radio', name, value: opt.value, checked: opt.value === cur });
      r.addEventListener('change', () => { cur = opt.value; if (o.onChange) o.onChange(cur); });
      box.append(h('label', null, r, h('span', { text: opt.label })));
    });
    const wrap = h('div', { class: 'ctl' }, o.label ? h('div', { class: 'lab', text: o.label }) : null, box, o.help ? h('div', { class: 'help', html: o.help }) : null); parent.append(wrap);
    return { el: wrap, get: () => cur, set(v) { cur = v; box.querySelectorAll('input').forEach((i) => { i.checked = i.value == v; }); } };
  };
  UI.select = function (parent, o) {
    const id = 'sel' + (++uid), sel = h('select', { id }); o.options.forEach((opt) => sel.append(h('option', { value: opt.value, text: opt.label })));
    sel.value = o.value; sel.addEventListener('change', () => { if (o.onChange) o.onChange(sel.value); });
    const wrap = h('div', { class: 'ctl' }, h('label', { for: id, text: o.label }), sel, o.help ? h('div', { class: 'help', html: o.help }) : null); parent.append(wrap);
    return { el: wrap, get: () => sel.value, set: (v) => { sel.value = v; } };
  };
  UI.check = function (parent, o) {
    const input = h('input', { type: 'checkbox', checked: !!o.value }); input.addEventListener('change', () => { if (o.onChange) o.onChange(input.checked); });
    const wrap = h('div', { class: 'ctl' }, h('label', { class: 'check' }, input, h('span', { text: o.label })), o.help ? h('div', { class: 'help', html: o.help }) : null); parent.append(wrap);
    return { el: wrap, get: () => input.checked, set: (v) => { input.checked = !!v; } };
  };
  UI.buttons = function (parent, list) {
    const box = h('div', { class: 'btns ctl' }), els = {};
    list.forEach((b) => { const el = h('button', { class: 'btn' + (b.primary ? ' primary' : ''), type: 'button', text: b.label, title: b.title, onclick: b.onClick }); box.append(el); els[b.id || b.label] = el; });
    parent.append(box); return els;
  };
  UI.read = function (parent, items) {
    const dl = h('dl', { class: 'read' }), dd = {};
    items.forEach((it) => { const d = h('dd', { id: null, text: '–' }); dd[it.id] = d; dl.append(h('dt', { text: it.label, title: it.title }), d); });
    parent.append(dl);
    return { set(id, text, cls) { dd[id].textContent = text; dd[id].className = cls || ''; } };
  };
  UI.note = function (parent, html, cls) { const n = h('p', { class: 'note ' + (cls || ''), html }); parent.append(n); return n; };
  UI.legend = function (parent, items) {
    const box = h('div', { class: 'legend' }); items.forEach((it) => box.append(h('span', null, UI.legendSwatch(it.shape || 'circle', it.color), it.label))); parent.append(box);
    return box;
  };
  /** a card holding a titled plot; returns {card, host, plot, cap} */
  UI.plotCard = function (parent, title, popts, cap) {
    const host = h('div'), card = h('section', { class: 'card plotcard' }, title ? h('h3', { text: title }) : null, host); parent.append(card);
    const plot = new Plot(host, popts); let capEl = null; if (cap) { capEl = h('div', { class: 'cap', html: cap }); card.append(capEl); }
    return { card, host, plot, cap: capEl };
  };
  /** "predict first" box tied to the in-class polls */
  UI.predict = function (parent, o) {
    const box = h('section', { class: 'predict' }, h('h3', { html: o.title || 'Predict first' }), h('div', { class: 'note', html: o.q })), opts = h('div', { class: 'opts' }), rev = h('div', { class: 'reveal note', html: o.reveal });
    o.options.forEach((t, i) => { const b = h('button', { class: 'btn', type: 'button', text: t, onclick() { box.classList.add('done'); [...opts.children].forEach((x, j) => { x.disabled = true; x.classList.add(j === o.answer ? 'right' : 'wrong'); }); if (o.onReveal) o.onReveal(i === o.answer); } }); opts.append(b); });
    box.append(opts, rev); parent.append(box); return box;
  };
  UI.progress = function (parent) { const bar = h('i'), box = h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100 }, bar); parent.append(box); return { set(f) { bar.style.width = (100 * UI.clamp(f, 0, 1)) + '%'; box.setAttribute('aria-valuenow', Math.round(100 * f)); } }; };

  /** time-sliced iteration: step(ms) does work and returns true while more remains; frame() repaints. */
  UI.animate = function (step, frame, opts) {
    opts = opts || {}; let on = false, raf = 0, last = 0;
    const tick = () => {
      raf = 0; if (!on) return; let more = true;
      try { more = step(opts.budget || 10); } catch (e) { console.error(e); more = false; }
      const now = performance.now();
      if (!UI.reduced || !more || now - last > 600) { last = now; frame(more); }
      if (more) raf = requestAnimationFrame(tick); else { on = false; if (opts.done) opts.done(); }
    };
    return { start() { on = true; if (!raf) raf = requestAnimationFrame(tick); }, stop() { on = false; if (raf) cancelAnimationFrame(raf); raf = 0; }, get running() { return on; } };
  };

  /** drop the side column for pages whose controls live inside their panels */
  UI.wide = function (shell) { shell.side.remove(); shell.stage.parentNode.style.gridTemplateColumns = 'minmax(0, 1fr)'; };

  /* ---------- page shell ---------- */
  UI.shell = function (id) {
    const S = window.SIMS, it = S.items.find((x) => x.id === id), cat = S.categories.find((c) => c.id === it.cat);
    const base = ROOT;
    const themeBtn = h('button', { class: 'themebtn', type: 'button', 'aria-label': 'Change colour theme' });
    const label = () => { const m = UI.themeMode(); themeBtn.textContent = m === 'dark' ? '☾ Dark' : m === 'light' ? '☀ Light' : '◐ Auto'; };
    themeBtn.onclick = () => { const order = ['auto', 'light', 'dark'], m = order[(order.indexOf(UI.themeMode()) + 1) % 3]; UI.setTheme(m); label(); }; label();
    const top = h('header', { class: 'top' }, h('a', { class: 'brand', href: base }, 'ML II ', h('small', { text: 'simulations' })),
      h('nav', { class: 'crumbs', 'aria-label': 'Breadcrumb' }, h('a', { href: base + '#' + cat.id, text: cat.name }), ' › ', it.short || it.title), themeBtn);
    const stage = h('section', { class: 'stage', 'aria-label': 'Simulation' }), side = h('aside', { class: 'side', 'aria-label': 'Controls' });
    const L = (window.LESSONS || {})[id], LP = L && UI.lesson ? UI.lesson(it, L) : null;
    const learn = h('section', { class: 'learn' },
      h('div', { class: 'card' }, h('h2', { text: 'What to notice' }), h('ul', { html: (it.notice || []).map((s) => '<li>' + s + '</li>').join('') })),
      LP ? null : h('div', { class: 'card' }, h('h2', { text: 'Try this' }), h('ol', { html: (it.tryit || []).map((s) => '<li>' + s + '</li>').join('') })),
      h('div', { class: 'card' }, h('h2', { text: 'Where this fits' }), h('p', { html: it.from || '' }), it.note ? h('p', { html: it.note }) : null));
    const peers = S.items.filter((x) => x.cat === it.cat), pi = peers.indexOf(it), all = S.items, ai = all.indexOf(it);
    const prev = all[ai - 1], next = all[ai + 1];
    const mk = (x, dir) => x ? h('a', { href: base + x.cat + '/' + x.slug + '/', rel: dir }, h('small', { text: dir === 'prev' ? '← Previous · Session ' + x.session : 'Next · Session ' + x.session + ' →' }), x.title) : h('span');
    const main = h('main', { class: 'page' + (LP ? ' has-lesson' : ''), id: 'main' },
      h('div', { class: 'titleblock' }, h('div', { class: 'badges' }, h('span', { class: 'badge session', text: 'Session ' + it.session }), h('span', { class: 'badge', text: cat.name })), h('h1', { text: it.title }), h('p', { class: 'lede', html: it.blurb })),
      LP ? LP.nav : null, LP ? LP.intro : null,
      h('div', { class: 'layout', id: 'sim' }, stage, side), LP ? [LP.read, LP.after] : null, LP ? h('h2', { class: 'ls-more', text: 'More notes' }) : null, learn, h('nav', { class: 'pager', 'aria-label': 'Other simulations' }, mk(prev, 'prev'), mk(next, 'next')));
    const app = document.getElementById('app') || document.body;
    app.append(h('a', { href: '#main', class: 'sr-only', text: 'Skip to simulation' }), top, main,
      h('footer', { class: 'foot' }, 'Advanced Machine Learning (ML II) · runs entirely in your browser, nothing is sent anywhere. ', h('a', { href: base, text: 'All simulations' }), '.'));
    document.title = it.title + ' · ML II simulations';
    return { stage, side, item: it, cat };
  };
})();
