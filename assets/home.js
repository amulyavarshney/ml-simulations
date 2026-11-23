/* Renders the catalogue from assets/sims.js: category sections, session filter, search. */
(function () {
  'use strict';
  const S = window.SIMS, app = document.getElementById('app');
  const h = (tag, attrs, ...kids) => { const el = document.createElement(tag); for (const k in attrs || {}) { const v = attrs[k]; if (v == null || v === false) continue; if (k === 'class') el.className = v; else if (k === 'html') el.innerHTML = v; else if (k === 'text') el.textContent = v; else if (k.startsWith('on')) el.addEventListener(k.slice(2), v); else el.setAttribute(k, v); } kids.forEach((c) => c != null && el.append(c.nodeType ? c : document.createTextNode(c))); return el; };
  let session = 'all', query = '';
  const themeBtn = h('button', { class: 'themebtn', type: 'button', 'aria-label': 'Change colour theme' });
  const mode = () => { try { return localStorage.getItem('mlsim-theme') || 'auto'; } catch (e) { return 'auto'; } };
  const setMode = (m) => { const r = document.documentElement; if (m === 'auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', m); try { localStorage.setItem('mlsim-theme', m); } catch (e) { } themeBtn.textContent = m === 'dark' ? '☾ Dark' : m === 'light' ? '☀ Light' : '◐ Auto'; };
  themeBtn.onclick = () => { const o = ['auto', 'light', 'dark']; setMode(o[(o.indexOf(mode()) + 1) % 3]); }; setMode(mode());
  const total = S.items.length;
  const hero = h('div', { class: 'hero' }, h('div', { class: 'badges' }, h('span', { class: 'badge session', text: 'Sessions 1 to 6' }), h('span', { class: 'badge', text: total + ' simulations' })),
    h('h1', { text: 'Advanced Machine Learning: interactive simulations' }),
    h('p', { text: 'Drag points, move sliders and watch PCA, t-SNE, UMAP, support vector machines and model evaluation (validation, leakage, tuning, calibration, decisions and model comparison) respond. Each page is one idea from a session, running entirely in your browser with the same algorithms the notebooks call.' }),
    h('p', { html: '<b>Each page is a full lesson, not just a widget:</b> the idea in plain words, an everyday picture, a step-by-step build-up, a worked example with numbers, guided experiments, tips to remember it, common mistakes, tiny annotated code snippets and a three-question self-check. Short on time? Open the <a href="revision/">revision sheet</a>.' }),
    h('p', { class: 'note', html: 'Numerical cores (PCA, SMO-based SVC / SVR / one-class SVM, logistic regression, t-SNE, fold schemes, AUC, feature selection, calibration curves, isotonic regression, McNemar and t-test p-values) are checked against scikit-learn and SciPy in <a href="https://github.com/amulyavarshney/ml-simulations/tree/main/tests">tests/</a>; the UMAP is a compact re-implementation. Course: B.Tech AIML, Year 2, Term 2.' }));
  const chips = h('div', { class: 'filters', role: 'group', 'aria-label': 'Filter by session' });
  const sessions = ['all', '1', '2', '3', '4', '5', '6'];
  const chipEls = sessions.map((s) => { const b = h('button', { class: 'chip', type: 'button', 'aria-pressed': s === 'all' ? 'true' : 'false', text: s === 'all' ? 'All sessions' : 'Session ' + s, onclick() { session = s; chipEls.forEach((c, i) => c.setAttribute('aria-pressed', sessions[i] === s ? 'true' : 'false')); render(); } }); chips.append(b); return b; });
  const search = h('input', { class: 'search', type: 'search', placeholder: 'Search simulations…', 'aria-label': 'Search simulations', oninput() { query = search.value.trim().toLowerCase(); render(); } }); chips.append(search);
  const list = h('div', { 'aria-live': 'polite' });
  app.append(h('header', { class: 'top' }, h('a', { class: 'brand', href: './' }, 'ML II ', h('small', { text: 'simulations' })), h('span', { class: 'crumbs' }), themeBtn), h('main', { class: 'page' }, hero, chips, list),
    h('footer', { class: 'foot' }, 'Built for Advanced Machine Learning (ML II). Runs entirely in your browser; nothing is sent anywhere. Datasets: UCI Wine and UCI optical digits (CC BY 4.0), loaded through scikit-learn.'));
  function render() {
    list.textContent = ''; let shown = 0;
    S.categories.forEach((cat) => {
      const items = S.items.filter((it) => it.cat === cat.id && (session === 'all' || String(it.session) === session) && (!query || (it.title + ' ' + it.blurb + ' ' + (it.tags || []).join(' ')).toLowerCase().includes(query)));
      if (!items.length) return; shown += items.length;
      const grid = h('div', { class: 'grid' });
      items.forEach((it) => grid.append(h('a', { class: 'card sim', href: it.cat + '/' + it.slug + '/' }, h('div', { class: 'meta' }, h('span', { class: 'badge', text: 'Session ' + it.session })), h('h3', { text: it.title }), h('p', { text: it.blurb.replace(/<[^>]+>/g, '') }), h('span', { class: 'go', text: 'Open the lesson →' }))));
      list.append(h('section', { class: 'cat', id: cat.id }, h('header', null, h('h2', { text: cat.name }), h('span', { class: 'badge', text: 'Session ' + cat.session })), h('p', { text: cat.blurb }), grid));
    });
    if (!shown) list.append(h('p', { class: 'empty', text: 'No simulation matches that search.' }));
  }
  render();
  if (location.hash) { const el = document.getElementById(location.hash.slice(1)); if (el) el.scrollIntoView(); }
})();
